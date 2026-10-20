export const instructions = `# iMessage

- Put a blank line between bubbles. Use single line breaks (no blank lines) for lines that belong in one bubble, like a list
- A few inline styles render. The markers touch the words. One asterisk is bold: *bold*. One underscore is italic: _italic_. Two underscores are underline: __underline__. One tilde is strikethrough: ~strike~. Example: that was *actually* wild
- Two asterisks, two tildes, headings, \`code\`, and [label](url) show up as raw characters. A link is a bare url. A list is plain lines. A line starting with * is not a bullet
- Bracket tags are the text effects under Effects. They render in the sentence

## Reactions

- To react, send a bubble with only a plus sign, the reaction, a space, and the message ID from context. Example: +love 59c55ce8-41d6-43cc-9116-8cfb2e696d7b
- The reaction can be love, like, dislike, laugh, emphasize, question, or any single emoji
- A reaction bubble has nothing else in it

## Replies

- To reply, start the bubble with > and the message ID from context, then a space, then your text. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b haha yeah that was wild
- > is only this prefix. It is not a quote
- Only the bubble that starts with > is a reply. Other bubbles are sent as normal

## Effects

Message effects and text effects are different.

- A message effect starts the bubble with ! and the name, then a space, then the text. Example: !confetti you got the job??
- Bubble effects: slam, loud, gentle, invisibleInk
- Screen effects: echo, spotlight, balloons, confetti, love, lasers, fireworks, shootingStar, celebration
- One message effect in a reply
- A text effect stays in the sentence. Wrap the words and close the tag. Example: that was [shake]so[/shake] bad
- Tag names: big, small, shake, nod, explode, ripple, bloom, jitter
- Those tags render as animations. ! is only for a message effect, so !shake is wrong

## Combining

- A reply can have a message effect. Put the reply first, then the effect. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b !confetti no way you got it
- Text effect tags and inline styles stay in the text. If the bubble also has a reply or a message effect, those prefixes still come first. Example: >59c55ce8-41d6-43cc-9116-8cfb2e696d7b !confetti no way you [big]got[/big] it
- A reaction is always its own bubble with nothing else
- To react and also say something, send the reaction bubble, then a normal bubble`;

const reactionPattern = /^\+(\S+) ([\w-]+)$/;
const replyPattern = /^>([\w-]+) ([\s\S]+)$/;
const effectPattern = /^!(\w+) ([\s\S]+)$/;

type Reaction = {
	messageId: string;
	reaction: string;
};

type Message = {
	text: string;
	replyToId?: string;
	effect?: string;
};

type ParsedBubble =
	| ({ kind: "reaction" } & Reaction)
	| ({ kind: "message" } & Message);

/** turn a bubble into a reaction, or a message with an optional reply and effect */
function parseBubble(bubble: string): ParsedBubble {
	const [, reaction, messageId] = bubble.match(reactionPattern) ?? [];
	if (reaction && messageId) {
		return {
			kind: "reaction",
			messageId,
			reaction,
		};
	}

	let text = bubble;
	let replyToId: string | undefined;
	let effect: string | undefined;

	const [, replyId, replyText] = text.match(replyPattern) ?? [];
	if (replyId && replyText) {
		replyToId = replyId;
		text = replyText;
	}

	const [, effectName, effectText] = text.match(effectPattern) ?? [];
	if (effectName && effectText) {
		effect = effectName;
		text = effectText;
	}

	return {
		kind: "message",
		text,
		...(replyToId && { replyToId }),
		...(effect && { effect }),
	};
}

/** split a text stream into bubbles on blank lines and call `onBubble` for each */
async function eachBubble(
	textStream: AsyncIterable<string>,
	onBubble: (bubble: string) => Promise<void> | void,
) {
	let buffer = "";

	for await (const delta of textStream) {
		const parts = `${buffer}${delta}`.split("\n\n");
		buffer = parts.pop() ?? "";

		for (const part of parts) {
			const bubble = part.trim();
			if (bubble) {
				await onBubble(bubble);
			}
		}
	}

	const rest = buffer.trim();
	if (rest) {
		await onBubble(rest);
	}
}

export async function deliver(
	textStream: AsyncIterable<string>,
	handlers: {
		reaction(input: Reaction): Promise<void> | void;
		message(input: Message): Promise<void> | void;
	},
): Promise<void> {
	await eachBubble(textStream, async (bubble) => {
		const parsed = parseBubble(bubble);
		if (parsed.kind === "reaction") {
			await handlers.reaction({
				messageId: parsed.messageId,
				reaction: parsed.reaction,
			});
			return;
		}

		await handlers.message({
			text: parsed.text,
			...(parsed.replyToId && { replyToId: parsed.replyToId }),
			...(parsed.effect && { effect: parsed.effect }),
		});
	});
}
