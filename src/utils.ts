import PictionaryMessage from './messages/messages';
import WebSocket from 'ws';
import { transformAndValidate } from 'class-transformer-validator';
import ErrorMessage from './messages/outgoing/error-message.out';

export async function onWsMessage(ws: WebSocket,
                                  callback: (message: PictionaryMessage) => any,
                                  coordsCallback: (coords: Uint16Array) => any): Promise<void> {
    ws.on('message', async (m: string | Buffer) => {
        // Handle coordinates
        if (m instanceof Buffer ) {
            const c = new Uint16Array(4);
            for (let i = 0; i < c.length; i++) {
                c[i] = m[2 * i] | m[2 * i + 1] << 8;
            }
            coordsCallback(c);
            return;
        }
        // Handle structured messages
        let p: PictionaryMessage;
        try {
            const po = await transformAndValidate(PictionaryMessage, JSON.parse((m as string)),
                                                    {validator: { forbidUnknownValues: true}});
            if (Array.isArray(po)) {
                throw new Error('Message cannot be array');
            } else {
                p = po;
            }
        } catch (errors) {
            console.log('Error:', errors); // TODO
            console.log(JSON.stringify(errors));
            const e = new ErrorMessage();
            e.code = 'validation-error';
            ws.send(JSON.stringify({message: e}));
            return;
        }

        callback(p);
    });
}
