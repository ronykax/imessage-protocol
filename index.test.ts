import { expect, test } from "bun:test";
import { deliver, instructions } from "./index.ts";

const id = "59c55ce8-41d6-43cc-9116-8cfb2e696d7b";

const bubbles = [
	`+❤️ ${id}`,
	`+love ${id}`,
	"that was *actually* wild\nstill the same bubble",
	`>${id} haha yeah that was wild`,
	"!confetti you got the job??",
	`>${id} !confetti no way you [big]got[/big] it`,
	"+this is just text",
	"trailing bubble",
];

/** yield the text with a cut inside a blank line and inside a word */
async function* chunked(source: string) {
	const separator = source.indexOf("\n\n");
	const midWord = source.indexOf("wild");
	const cuts = [separator + 1, midWord + 2].sort((a, b) => a - b);

	let start = 0;
	for (const cut of cuts) {
		yield source.slice(start, cut);
		start = cut;
	}

	if (start < source.length) {
		yield source.slice(start);
	}
}

test("instructions are the iMessage prompt", () => {
	expect(instructions.startsWith("## iMessage\n")).toBe(true);
	expect(instructions).toContain("+love");
	expect(instructions).toContain("!confetti");
});

test("deliver splits a chunked stream into reactions and messages", async () => {
	const source = bubbles.join("\n\n");
	const reactions: { messageId: string; reaction: string }[] = [];
	const messages: { text: string; replyToId?: string; effect?: string }[] =
		[];

	await deliver(chunked(source), {
		reaction(input) {
			reactions.push(input);
		},
		message(input) {
			messages.push(input);
		},
	});

	expect(reactions).toEqual([
		{ messageId: id, reaction: "❤️" },
		{ messageId: id, reaction: "love" },
	]);

	expect(messages).toEqual([
		{ text: "that was *actually* wild\nstill the same bubble" },
		{ text: "haha yeah that was wild", replyToId: id },
		{ text: "you got the job??", effect: "confetti" },
		{
			text: "no way you [big]got[/big] it",
			replyToId: id,
			effect: "confetti",
		},
		{ text: "+this is just text" },
		{ text: "trailing bubble" },
	]);

	const [plain, reply, effectOnly] = messages;
	expect(Object.hasOwn(plain!, "replyToId")).toBe(false);
	expect(Object.hasOwn(plain!, "effect")).toBe(false);
	expect(Object.hasOwn(reply!, "effect")).toBe(false);
	expect(Object.hasOwn(effectOnly!, "replyToId")).toBe(false);
});

test("waits for each handler before the next bubble", async () => {
	const events: string[] = [];
	let releaseFirst: () => void = () => {};
	let sawFirst: () => void = () => {};
	const firstDone = new Promise<void>((resolve) => {
		releaseFirst = resolve;
	});
	const firstStarted = new Promise<void>((resolve) => {
		sawFirst = resolve;
	});

	async function* stream() {
		yield "one\n\ntwo";
	}

	const delivered = deliver(stream(), {
		reaction() {},
		async message({ text }) {
			events.push(`start ${text}`);
			if (text === "one") {
				sawFirst();
				await firstDone;
			}
			events.push(`end ${text}`);
		},
	});

	await firstStarted;
	expect(events).toEqual(["start one"]);

	releaseFirst();
	await delivered;

	expect(events).toEqual(["start one", "end one", "start two", "end two"]);
});
