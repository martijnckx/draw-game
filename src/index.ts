import 'reflect-metadata';
import dotenv from 'dotenv';
import express from 'express';
import expressWs from 'express-ws';
import path from 'path';
import { onWsMessage } from './utils';
import PictionaryServer from './logic/pictionary-server';
import Player from './logic/player';
import ErrorMessage from './messages/outgoing/error-message.out';

// initialize configuration
dotenv.config();

// port is now available to the Node.js runtime
// as if it were an environment variable
const port = process.env.SERVER_PORT;

const { app, getWss, applyTo } = expressWs(express());

// Configure Express to use EJS
app.set( 'views', path.join( __dirname, 'views' ) );
app.set( 'view engine', 'ejs' );

// Configure Express to serve static files in the public folder
app.use( express.static( path.join( __dirname, 'public' ) ) );

// define a route handler for the default home page
app.get( '/', ( req, res ) => {
    // render the index template
    res.render( 'index' );
} );

const pictionaryServer = new PictionaryServer();

app.ws('/socket', (ws, req) => {
    let joined = false;
    onWsMessage(ws, (m) => {
        if (joined) { return; }

        if (m.message.event === 'join') {
            try {
                pictionaryServer.find(m.message.room).addPlayer(new Player(ws, m.message.name.trim()));
                joined = true;
            }  catch (err) {
                const e = new ErrorMessage();
                e.code = 'room-non-existent';
                ws.send(JSON.stringify({message: e}));
            }
        } else if (m.message.event === 'create') {
            const game = pictionaryServer.create();
            game.addPlayer(new Player(ws, m.message.name.trim()));
            joined = true;
        } else if (m.message.event === 'rejoin') {
            let room;
            let player;

            try {
                room = pictionaryServer.find(m.message.room);
            }  catch (err) {
                const e = new ErrorMessage();
                e.code = 'room-non-existent';
                ws.send(JSON.stringify({message: e}));
                ws.close();
                return;
            }

            try {
                player = room.getPlayer(m.message.playerId);
            }  catch (err) {
                const e = new ErrorMessage();
                e.code = 'player-non-existent';
                ws.send(JSON.stringify({message: e}));
                ws.close();
                return;
            }

            player.reConnect(ws);

            joined = true;
        } else {
            const e = new ErrorMessage();
            e.code = 'wrong-flow';
            ws.send(JSON.stringify({message: e}));
            ws.close();
        }
    }, (x: Uint16Array) => {return; } );
});

// start the express server
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log(`server started at http://localhost:${port}`);
});

// const g = new Game();
