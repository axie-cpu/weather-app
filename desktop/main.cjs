const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");

const WIDGET_URL =
  process.env.ATMOSPHERE_URL ||
  "https://axie-cpu.github.io/weather-app/?widget=1";

const SIZE = { w: 380, h: 700, minW: 320, minH: 520 };
let mainWindow = null;
let tray = null;

function statePath() {
  return path.join(app.getPath("userData"), "widget-state.json");
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath(), "utf8"));
  } catch {
    return { pinned: true, corner: "tr" };
  }
}

function saveState(partial) {
  const next = { ...loadState(), ...partial };
  fs.mkdirSync(app.getPath("userData"), { recursive: true });
  fs.writeFileSync(statePath(), JSON.stringify(next));
  return next;
}

function cornerBounds(corner) {
  const area = screen.getPrimaryDisplay().workArea;
  const pad = 14;
  const x =
    corner === "tl" || corner === "bl"
      ? area.x + pad
      : area.x + area.width - SIZE.w - pad;
  const y =
    corner === "tl" || corner === "tr"
      ? area.y + pad
      : area.y + area.height - SIZE.h - pad;
  return { x, y, width: SIZE.w, height: SIZE.h };
}

function applyAlwaysOnTop(win, pinned) {
  if (pinned) {
    win.setAlwaysOnTop(true, "screen-saver");
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  } else {
    win.setAlwaysOnTop(false);
    win.setVisibleOnAllWorkspaces(false);
  }
}

function createWindow() {
  const state = loadState();
  const bounds = state.bounds || cornerBounds(state.corner || "tr");

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: SIZE.minW,
    minHeight: SIZE.minH,
    frame: false,
    transparent: false,
    resizable: true,
    skipTaskbar: false,
    fullscreenable: false,
    backgroundColor: "#070b14",
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  applyAlwaysOnTop(mainWindow, state.pinned !== false);
  mainWindow.loadURL(WIDGET_URL);

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("moved", persistBounds);
  mainWindow.on("resized", persistBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function persistBounds() {
  if (!mainWindow) return;
  saveState({ bounds: mainWindow.getBounds() });
}

function createTray() {
  const png = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAANlBMVEUAAAD////////////////////////////////////////////////////////////////////xY8b8AAAAEnRSTlMAECAwQFBgcICPn6+/z9/vX5rB2wAAAJFJREFUOMvd0kkSgCAMRNGOIOA8/nOqFIkK0rXJ+ks6L5lQSn0YhhmGYZh/jLVmpZRaay2llFJKKaWU+g8A0Fo751pr7Zxz1lprjfHeO+e8994YY4wxxnsPADinlFJKKaWU+gYAY4y11lprrbXWWmuttdZaa6211lprrbXW+j8A3ntjjDHGGGOMMcYYY4wxxhhjjDHGGGOMMcYYY4z5AedwE0vQ6n9UAAAAAElFTkSuQmCC"
  );
  tray = new Tray(png.resize({ width: 16, height: 16 }));
  tray.setToolTip("Atmosphere weather");
  const menu = Menu.buildFromTemplate([
    { label: "Show widget", click: () => mainWindow?.show() },
    {
      label: "Pin to top",
      type: "checkbox",
      checked: loadState().pinned !== false,
      click: (item) => {
        saveState({ pinned: item.checked });
        if (mainWindow) applyAlwaysOnTop(mainWindow, item.checked);
      },
    },
    { type: "separator" },
    { label: "Top right", click: () => snap("tr") },
    { label: "Top left", click: () => snap("tl") },
    { label: "Bottom right", click: () => snap("br") },
    { label: "Bottom left", click: () => snap("bl") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
  tray.on("click", () => {
    if (!mainWindow) return;
    if (mainWindow.isVisible()) mainWindow.hide();
    else mainWindow.show();
  });
}

function snap(corner) {
  if (!mainWindow) return;
  mainWindow.setBounds(cornerBounds(corner));
  saveState({ corner, bounds: mainWindow.getBounds() });
}

ipcMain.handle("widget:state", () => {
  const s = loadState();
  return { pinned: s.pinned !== false, corner: s.corner || "tr" };
});
ipcMain.handle("widget:pin", (_e, pinned) => {
  saveState({ pinned });
  if (mainWindow) applyAlwaysOnTop(mainWindow, pinned);
  return { pinned };
});
ipcMain.handle("widget:snap", (_e, corner) => {
  snap(corner);
  return { corner };
});
ipcMain.handle("widget:minimize", () => {
  mainWindow?.minimize();
});
ipcMain.handle("widget:hide", () => {
  mainWindow?.hide();
});
ipcMain.handle("widget:close", () => {
  app.quit();
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    mainWindow.show();
    mainWindow.focus();
  });
  app.whenReady().then(() => {
    createWindow();
    createTray();
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
  else mainWindow?.show();
});
