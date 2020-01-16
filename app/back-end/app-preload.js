const ContextMenuBuilder = require('./helpers/context-menu-builder.js');
const ContextMenuListener = require('./helpers/context-menu-listener.js');

let contextMenuBuilder = new ContextMenuBuilder();
let contextMenuListener = new ContextMenuListener((info) => {
    contextMenuBuilder.showPopupMenu(info);
});

