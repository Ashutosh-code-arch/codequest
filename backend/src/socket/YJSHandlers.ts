import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";

// ------ Message types (match y-websocket protocol) --------------------
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// -------- Per-room Y.js state -------------------

interface RoomYState {
    doc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
    saveTimer: NodeJS.Timeout | null;
}

  
