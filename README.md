# imessage-protocol

Agents use iMessage from a text stream: several bubbles, a reaction on a message, a reply to one, and message effects. Append `instructions` to the system prompt. `deliver` turns the stream into sends.

A blank line is a new bubble, sent as soon as it closes. A single line break stays in the same bubble. The id is a message id from context.

```
that was *actually* wild
still the same bubble

+love 59c55ce8-41d6-43cc-9116-8cfb2e696d7b

>59c55ce8-41d6-43cc-9116-8cfb2e696d7b haha yeah that was wild

!confetti you got the job??

>59c55ce8-41d6-43cc-9116-8cfb2e696d7b !confetti no way you [big]got[/big] it
```

`+reaction id` is a reaction and the whole bubble. `reaction` is a string. To also say something, send the `+` bubble, then a normal one.

`>id text` replies. `!effect text` plays a message effect. `effect` is a string. A reply with an effect puts `>` first: `>id !confetti text`.

Text effects wrap words: `[shake]so[/shake]`. The tag is a string. Inline style touches the word: `*bold*`, `_italic_`, `__underline__`, `~strike~`. A link is a bare URL.

```ts
import { deliver, instructions } from "imessage-protocol";

// append `instructions` to the system prompt

await deliver(result.textStream, {
  reaction({ messageId, reaction }) {
    // API request to Photon / Linq / Loop Message { message_id, reaction }
  },
  message({ text, replyToId, effect }) {
    // API request to Photon / Linq / Loop Message { text, reply_to_id?, effect? }
  },
});
```

`reaction` and `effect` are the strings the model wrote.
