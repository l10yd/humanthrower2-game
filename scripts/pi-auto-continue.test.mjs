import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";
import vm from "node:vm";

// Use the production extension, without pi, network requests, or real-time waits.
const source = stripTypeScriptTypes(readFileSync(new URL("../.pi/extensions/auto-continue.ts", import.meta.url), "utf8"))
	.replace("export default function", "function install") + "\ninstall(pi);";

function harness({ mode = "tui", auto = false, seconds = "30", history = true } = {}) {
	let now = 0;
	let nextTimer = 0;
	const timers = new Map();
	const handlers = new Map();
	const commands = new Map();
	const flags = new Map([["auto-continue", auto], ["auto-continue-seconds", seconds]]);
	const inputs = new Set();
	const sent = [];
	const notifications = [];
	const statuses = new Map();
	const state = { idle: true, pending: false, editor: "" };
	const ctx = {
		mode, hasUI: mode === "tui", isIdle: () => state.idle, hasPendingMessages: () => state.pending,
		sessionManager: { getBranch: () => history ? [{ type: "message", message: { role: "user" } }] : [] },
		ui: {
			setStatus: (key, text) => statuses.set(key, text),
			notify: (text, level) => notifications.push({ text, level }),
			getEditorText: () => state.editor,
			onTerminalInput: (fn) => { inputs.add(fn); return () => inputs.delete(fn); },
		},
	};
	const pi = {
		registerFlag() {}, getFlag: (name) => flags.get(name),
		on: (name, fn) => handlers.set(name, fn),
		registerCommand: (name, spec) => commands.set(name, spec.handler),
		sendUserMessage: (text) => { sent.push(text); },
	};
	class FakeDate extends Date { static now() { return now; } }
	vm.runInNewContext(source, {
		pi, Date: FakeDate,
		setInterval: (fn) => { const id = ++nextTimer; timers.set(id, fn); return id; },
		clearInterval: (id) => timers.delete(id),
	});
	const emit = async (type, data = {}) => handlers.get(type)?.({ type, ...data }, ctx);
	const advance = (seconds) => {
		for (let i = 0; i < seconds; i++) {
			now += 1000;
			for (const fn of [...timers.values()]) fn();
		}
	};
	const complete = async (outcome = "completed", aborted = false) => {
		await emit("before_agent_start");
		await emit("agent_before_settle", { outcome });
		state.idle = true;
		await emit("agent_settled", { aborted });
	};
	return {
		emit, advance, complete, state, sent, notifications, statuses, timers, inputs,
		command: (args) => commands.get("autocontinue")(args, ctx),
		keypress: () => { for (const fn of inputs) fn("x"); },
	};
}

test("off by default; first task required even when CLI-enabled", async () => {
	const off = harness(); await off.emit("session_start"); await off.complete(); off.advance(100);
	assert.deepEqual(off.sent, []);
	const on = harness({ auto: true }); await on.emit("session_start"); on.advance(100);
	assert.deepEqual(on.sent, []);
	await on.complete(); on.advance(29); assert.equal(on.sent.length, 0);
	on.advance(1); assert.deepEqual(on.sent, ["продолжаем"]);
});

test("exactly one message per settlement, including slow startup", async () => {
	const h = harness({ auto: true }); await h.emit("session_start"); await h.complete();
	h.advance(200); assert.equal(h.sent.length, 1);
	await h.complete(); h.advance(30); assert.equal(h.sent.length, 2);
});

test("working, retries/compaction, queue, editor, and dialogs block dispatch", async () => {
	for (const blocker of ["working", "pending", "editor", "dialog"]) {
		const h = harness({ auto: true }); await h.emit("session_start"); await h.complete();
		h.advance(20);
		if (blocker === "working") h.state.idle = false;
		if (blocker === "pending") h.state.pending = true;
		if (blocker === "editor") h.state.editor = "my draft";
		if (blocker === "dialog") await h.emit("ui_prompt_start");
		h.advance(60); assert.equal(h.sent.length, 0, blocker);
		h.state.idle = true; h.state.pending = false; h.state.editor = "";
		if (blocker === "dialog") await h.emit("ui_prompt_end");
		h.advance(29); assert.equal(h.sent.length, 0, blocker);
		h.advance(1); assert.equal(h.sent.length, 1, blocker);
	}
});

test("terminal activity restarts the full idle delay", async () => {
	const h = harness({ auto: true }); await h.emit("session_start"); await h.complete();
	h.advance(29); h.keypress(); h.advance(29); assert.equal(h.sent.length, 0);
	h.advance(1); assert.equal(h.sent.length, 1);
});

test("Escape still disables automation", async () => {
	for (const [outcome, aborted] of [["aborted", false], ["completed", true], ["error", true]]) {
		const h = harness({ auto: true }); await h.emit("session_start"); await h.complete(outcome, aborted);
		h.advance(100); assert.equal(h.sent.length, 0);
		assert.equal(h.statuses.get("auto-continue"), "AUTO off");
		await h.complete(); h.advance(100); assert.equal(h.sent.length, 0);
		await h.command("on 5"); h.advance(5); assert.equal(h.sent.length, 1);
	}
});

test("exhausted rate-limit retries keep automation enabled with the normal idle delay", async () => {
	const h = harness({ auto: true }); await h.emit("session_start");
	await h.emit("before_agent_start"); h.state.idle = false;
	// Low-level ends and internal retries must not dispatch a new user message.
	for (let attempt = 0; attempt < 4; attempt++) {
		await h.emit("agent_end", { messages: [{ role: "assistant", stopReason: "error",
			errorMessage: "Your requests to gpt-6.1-sol for gpt-6.1-sol in eastus2 have exceeded token rate limit." }] });
		h.advance(100); assert.equal(h.sent.length, 0);
	}
	await h.emit("agent_before_settle", { outcome: "error" });
	// Still no dispatch until agent_settled, even after the boundary.
	h.advance(100); assert.equal(h.sent.length, 0);
	h.state.idle = true; await h.emit("agent_settled", { aborted: false });
	assert.equal(h.statuses.get("auto-continue"), "AUTO 30s");
	assert.match(h.notifications.at(-1).text, /остаётся включённым/);
	assert.match(h.notifications.at(-1).text, /после 30 с простоя/);
	await h.command("status"); assert.match(h.notifications.at(-1).text, /простой 30 с/);
	h.advance(29); assert.equal(h.sent.length, 0);
	h.advance(1); assert.deepEqual(h.sent, ["продолжаем"]);
	h.advance(1000); assert.equal(h.sent.length, 1); // Slow startup must not duplicate dispatch.
});

test("consecutive final errors always retry after 30 seconds, just like success", async () => {
	const h = harness({ auto: true }); await h.emit("session_start");
	for (let index = 0; index < 20; index++) {
		await h.complete("error");
		assert.equal(h.statuses.get("auto-continue"), "AUTO 30s");
		assert.match(h.notifications.at(-1).text, /после 30 с простоя/);
		h.advance(29); assert.equal(h.sent.length, index);
		h.advance(1); assert.equal(h.sent.length, index + 1);
	}
	await h.complete(); assert.equal(h.statuses.get("auto-continue"), "AUTO 30s");
	h.advance(29); assert.equal(h.sent.length, 20);
	h.advance(1); assert.equal(h.sent.length, 21);
	await h.complete("error");
	h.advance(29); assert.equal(h.sent.length, 21);
	h.advance(1); assert.equal(h.sent.length, 22);
});

test("error retries always use the operator-selected interval without extra delays", async () => {
	for (const seconds of [5, 30, 60, 1200]) {
		const h = harness({ auto: true, seconds: String(seconds) }); await h.emit("session_start");
		for (let i = 0; i < 6; i++) {
			await h.complete("error");
			assert.equal(h.statuses.get("auto-continue"), `AUTO ${seconds}s`);
			h.advance(seconds - 1); assert.equal(h.sent.length, i);
			h.advance(1); assert.equal(h.sent.length, i + 1);
		}
	}
});

test("error retries obey activity, queue, editor and UI blockers", async () => {
	for (const blocker of ["working", "pending", "editor", "dialog", "keypress"]) {
		const h = harness({ auto: true }); await h.emit("session_start"); await h.complete("error");
		h.advance(29);
		if (blocker === "keypress") h.keypress();
		else {
			if (blocker === "working") h.state.idle = false;
			if (blocker === "pending") h.state.pending = true;
			if (blocker === "editor") h.state.editor = "draft";
			if (blocker === "dialog") await h.emit("ui_prompt_start");
			h.advance(100); assert.equal(h.sent.length, 0, blocker);
			h.state.idle = true; h.state.pending = false; h.state.editor = "";
			if (blocker === "dialog") await h.emit("ui_prompt_end");
		}
		h.advance(29); assert.equal(h.sent.length, 0, blocker);
		h.advance(1); assert.equal(h.sent.length, 1, blocker);
	}
});

test("manual off cancels a waiting retry and final errors do not turn it back on", async () => {
	const h = harness({ auto: true }); await h.emit("session_start"); await h.complete("error");
	h.advance(29); await h.command("off"); h.advance(1000);
	assert.equal(h.sent.length, 0); assert.equal(h.statuses.get("auto-continue"), "AUTO off");
	await h.complete("error"); h.advance(1000);
	assert.equal(h.sent.length, 0); assert.equal(h.statuses.get("auto-continue"), "AUTO off");
	await h.command("on 5"); h.advance(4); assert.equal(h.sent.length, 0);
	h.advance(1); assert.equal(h.sent.length, 1);
});

test("an error while off never enables automation or schedules error notices", async () => {
	const h = harness(); await h.emit("session_start"); await h.complete("error"); h.advance(1000);
	assert.equal(h.sent.length, 0); assert.equal(h.statuses.get("auto-continue"), "AUTO off");
	assert.equal(h.notifications.length, 0);
});

test("reload and tree navigation discard pending error continuation", async () => {
	for (const replacement of ["reload", "tree"]) {
		const h = harness({ auto: true }); await h.emit("session_start");
		await h.complete("error"); await h.complete("error");
		if (replacement === "reload") {
			await h.emit("session_shutdown"); await h.emit("session_start");
		} else await h.emit("session_tree");
		h.advance(1000); assert.equal(h.sent.length, 0);
		await h.complete("error");
		assert.equal(h.statuses.get("auto-continue"), "AUTO 30s");
		h.advance(29); assert.equal(h.sent.length, 0);
		h.advance(1); assert.equal(h.sent.length, 1);
	}
});

test("commands enable existing sessions, change interval, and stop sending", async () => {
	const h = harness(); await h.emit("session_start");
	await h.command("on 60"); h.advance(59); assert.equal(h.sent.length, 0);
	h.advance(1); assert.equal(h.sent.length, 1);
	await h.complete(); await h.command("off"); h.advance(100); assert.equal(h.sent.length, 1);
	await h.command("status"); assert.match(h.notifications.at(-1).text, /выключено/);
	await h.command("on 5"); h.advance(5); assert.equal(h.sent.length, 2);
});

test("new empty session does not start a task just because on is issued", async () => {
	const h = harness({ history: false }); await h.emit("session_start"); await h.command("on 5");
	h.advance(100); assert.equal(h.sent.length, 0);
	await h.complete(); h.advance(5); assert.equal(h.sent.length, 1);
});

test("invalid intervals and command arguments fail closed", async () => {
	for (const value of ["0", "4", "86401", "-1", "1.5", "foo", "", "30;evil"]) {
		const h = harness({ auto: true, seconds: value }); await h.emit("session_start"); await h.complete();
		h.advance(100); assert.equal(h.sent.length, 0, value);
		await h.command(`on ${value}`.trim() === "on" ? "on bad" : `on ${value}`);
		assert.equal(h.notifications.at(-1).level, "error", value);
	}
	const h = harness(); await h.emit("session_start");
	for (const command of ["on 5 extra", "off extra", "status extra", "what"]) {
		await h.command(command); assert.equal(h.notifications.at(-1).level, "error");
	}
});

test("no timers or sending in RPC, print, or JSON modes", async () => {
	for (const mode of ["rpc", "print", "json"]) {
		const h = harness({ auto: true, mode }); await h.emit("session_start"); await h.complete();
		await h.command("on 5"); h.advance(100);
		assert.equal(h.timers.size, 0); assert.equal(h.inputs.size, 0); assert.equal(h.sent.length, 0);
	}
});

test("shutdown/reload removes resources and cannot continue an old session", async () => {
	const h = harness({ auto: true }); await h.emit("session_start"); await h.complete();
	await h.emit("session_shutdown"); await h.emit("session_shutdown"); h.advance(100);
	assert.equal(h.timers.size, 0); assert.equal(h.inputs.size, 0); assert.equal(h.sent.length, 0);
	await h.emit("session_start"); await h.emit("session_start");
	assert.equal(h.timers.size, 1); assert.equal(h.inputs.size, 1);
	h.advance(100); assert.equal(h.sent.length, 0);
});

test("tree navigation disarms until another task or explicit on", async () => {
	const h = harness({ auto: true }); await h.emit("session_start"); await h.complete();
	await h.emit("session_tree"); h.advance(100); assert.equal(h.sent.length, 0);
	await h.command("on 5"); h.advance(5); assert.equal(h.sent.length, 1);
});
