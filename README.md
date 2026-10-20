# imessage-protocol

Deliver your model's text stream as iMessage bubbles: reactions, replies, message effects, and multiple sends.

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

`reaction` and `effect` are strings. Which names to use is described in `instructions`.
