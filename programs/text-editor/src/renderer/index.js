requirejs.config({
  paths: {
    vs: "../node_modules/monaco-editor/min/vs",
    xterm: "../node_modules/@xterm/xterm/lib/xterm",
  },
});

let fileDataList = [];
let filePathActive = null;
let openTabs = [];
// hold initial content of each file to check if changes have been made
let initialContentMap = {};
let el;
let editor;
let term;

window.onload = () => {
  el = {
    newDocumentBtn: document.getElementById("newfile"),
    folderList: document.getElementById("folderlist"),
    explorer: document.getElementById("exploreritems"),
    tabList: document.getElementById("tablist"),
    editorArea: document.getElementById("editorarea"),
    editor: document.getElementById("editor"),
    terminal: document.getElementById("terminal"),
    terminalArea: document.getElementById("terminalarea"),
  };

  window.ipc.receive("file", (data) => {
    handleOpenFile(data);
  });

  window.ipc.receive("folder", (data) => {
    addFolder(data);
    addFolderEventListeners();
  });

  window.ipc.receive("get-save", (_data) => {
    let content = getContent();
    window.ipc.send("save-file", { filePathActive, content });
  });

  window.ipc.receive("get-save-as", (_data) => {
    let content = getContent();
    window.ipc.send("save-file-as", { content });
  });

  window.ipc.receive("open-terminal", (_data) => {
    openTerminal();
  });

  require(["vs/editor/editor.main"], () => {
    editor = monaco.editor.create(el.editor, {
      value: "",
      language: undefined,
    });
  });

  window.onresize = () => {
    editor.layout();
  };
};

//-------------------------------------------------------------------------------------------------
// Editor
//-------------------------------------------------------------------------------------------------

const createModelForFile = (file) => {
  // retrieve file extension
  const filePath = file.path;
  const extension = filePath.fullpath.split(".").pop();
  const language = getLanguageId(extension);
  monaco.editor.createModel(file.data, language, monaco.Uri.parse(file.path.fullpath));
};

const getLanguageId = (extension) => {
  const languages = monaco.languages.getLanguages();
  let languageId = null;

  languages.forEach((language) => {
    if (language.extensions && language.extensions.includes("." + extension)) {
      languageId = language.id;
    }
  });

  return languageId;
};

const disposeModel = (filePath) => {
  const uri = monaco.Uri.parse(filePath.fullpath);
  const model = monaco.editor.getModel(uri);
  if (model) {
    model.dispose();
  }
};

const getContent = () => {
  const uri = monaco.Uri.parse(filePathActive.fullpath);
  const model = monaco.editor.getModel(uri);
  const value = model.getValue();
  return value;
};

//-------------------------------------------------------------------------------------------------
// Terminal
//-------------------------------------------------------------------------------------------------

const openTerminal = () => {
  el.terminalArea.style.display = "block";

  require(["xterm"], (xterm) => {
    term = new xterm.Terminal({
      cols: 80,
      rows: 10,
    });
    term.options = {
      theme: {
        background: "#3B3B3B",
      },
      fontSize: 12,
    };

    term.open(el.terminal);
    term.onData((data) => {
      window.ipc.send("terminal-data", data);
    });
  });
  window.dispatchEvent(new Event("resize"));
};

window.ipc.receive("terminal-output", (data) => {
  term.write(data);
});

window.ipc.receive("close-terminal", (_data) => {
  el.terminalArea.style.display = "none";
  term.dispose();
  term = null;
  window.dispatchEvent(new Event("resize"));
});

//-------------------------------------------------------------------------------------------------
// File Management
//-------------------------------------------------------------------------------------------------

const handleOpenFile = (file, parent = el.explorer) => {
  if (!fileInList(file.path)) {
    fileDataList.push(file);
    addFileToList(file, parent);
    initialContentMap[file.path.fullpath] = file.data;
  } else {
    replaceFileData(file);
  }
};

const addFileToList = (file, parent) => {
  let filePath = file.path;
  filePathActive = filePath;

  // set up file item
  let fileItem = document.createElement("li");
  if (parent !== el.explorer) {
    fileItem.style.display = "none";
  }
  // set up file link
  let fileLink = document.createElement("button");
  fileLink.textContent = filePath.base;

  // add event listener - add tab - to file
  fileLink.addEventListener("click", () => {
    addTab(file);
  });

  // add link to file item
  fileItem.appendChild(fileLink);

  //add file item to it's parent (root folder parent is explorer)
  parent.appendChild(fileItem);
};

const removeFileFromList = (filePath) => {
  Array.from(el.explorer.children).forEach((item) => {
    if (item.textContent === filePath.base) {
      item.remove();
    }
  });
  //remove from data list
  fileDataList.forEach((file, index) => {
    if (file.path.fullpath === filePath.fullpath) {
      fileDataList.splice(index, 1);
    }
  });
};

const displayFile = (filePath) => {
  const uri = monaco.Uri.parse(filePath.fullpath);
  const model = monaco.editor.getModel(uri);
  editor.setModel(model);
  filePathActive = filePath;
  highlightTab(filePath);
};

const areFilesEqual = (file1, file2) => {
  return file1.fullpath === file2.fullpath;
};

const fileInList = (filePath) => {
  let found = false;
  fileDataList.forEach((file) => {
    if (areFilesEqual(filePath, file.path)) {
      found = true;
      return;
    }
  });
  return found;
};

const replaceFileData = (file) => {
  fileDataList.forEach((listFile) => {
    if (areFilesEqual(listFile.path, file.path)) {
      listFile.data = file.data;
      if (filePathActive.fullpath === file.path.fullpath) {
        displayFile(file.path);
      }
    }
  });
};

//-------------------------------------------------------------------------------------------------
// Folder Management
//-------------------------------------------------------------------------------------------------

const addFolder = (folder, parent = el.explorer) => {
  let folderPath = folder.path;
  let contents = folder.data;

  let folderItem = document.createElement("li");
  folderItem.setAttribute("id", "folder");
  if (parent !== el.explorer) {
    folderItem.style.display = "none";
  }

  // set up folder link
  let folderLink = document.createElement("button");
  // add arrow icon
  let icon = document.createElement("i");
  icon.classList.add("bx", "bxs-chevron-right");
  let buttonText = document.createTextNode(folderPath.base);

  folderLink.appendChild(icon);
  folderLink.appendChild(buttonText);

  // add link to folder item
  folderItem.appendChild(folderLink);
  // add folder item to list
  parent.appendChild(folderItem);

  contents.forEach((item) => {
    // if item is a file, add as file
    if (item.type == "file") {
      handleOpenFile(item, folderItem);
    }

    // if item is a folder, use recursion to add items
    if (item.type == "folder") {
      addFolder(item, folderItem);
    }
  });
};

// adds event listener - hide files - to all folders
const addFolderEventListeners = () => {
  const folderElements = document.querySelectorAll("[id='folder']");

  let root = folderElements[0];
  root.addEventListener("click", ({ target }) => {
    let sibling = target.nextElementSibling;

    while (sibling) {
      sibling.style.display = sibling.style.display == "block" ? "none" : "block";
      sibling = sibling.nextElementSibling;
    }

    target.classList.toggle("expanded");
  });
};

//-------------------------------------------------------------------------------------------------
// Tab Management
//-------------------------------------------------------------------------------------------------

const addTab = (file) => {
  const filePath = file.path;

  if (isTabOpen(filePath)) {
    displayFile(filePath);
    return;
  }

  const tabItem = document.createElement("li");
  const tabLink = document.createElement("button");
  const closeButton = document.createElement("button");

  // set up tab link
  tabLink.textContent = filePath.base;
  tabLink.addEventListener("click", () => {
    displayFile(filePath);
  });
  tabLink.setAttribute("class", "tabbutton");
  tabLink.dataset.fullpath = filePath.fullpath;

  // set up close button
  closeButton.textContent = "X";
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    handleCloseTab(tabItem, filePath);
  });
  closeButton.setAttribute("class", "closebutton");

  // append tab and close button to tab item
  tabItem.appendChild(tabLink);
  tabItem.appendChild(closeButton);

  // append tab item to tab list
  el.tabList.appendChild(tabItem);

  // add tab to openTabs list
  openTabs.push(filePath);

  createModelForFile(file);
  // display file
  displayFile(filePath);
};

const handleCloseTab = (tabItem, filePath) => {
  const modelUri = monaco.Uri.parse(filePath.fullpath);
  const model = monaco.editor.getModel(modelUri);
  if (!model) return;

  const currentContent = model.getValue();
  const initialContent = initialContentMap[filePath.fullpath];

  // check user want to close without saving
  if (currentContent !== initialContent) {
    const confirmation = window.confirm("Close tab without saving?");
    if (confirmation) {
      closeTab(tabItem, filePath);
    }
  } else {
    closeTab(tabItem, filePath);
  }
};

const closeTab = (tabItem, filePath) => {
  // remove tab item
  tabItem.remove();

  // dispose editor model
  disposeModel(filePath);

  // remove from openTabs list
  openTabs.forEach((tab, index) => {
    if (tab.fullpath === filePath.fullpath) {
      openTabs.splice(index, 1);
    }
  });

  // if no other tabs, display nothing
  if (openTabs.length == 0) {
    filePathActive = null;
    return;
  }

  // if other tabs available, display first in list
  if (openTabs.length > 0) {
    displayFile(openTabs[0]);
  }
};

// check if a tab is open
const isTabOpen = (filePath) => {
  let found = false;

  openTabs.forEach((item) => {
    if (filePath.fullpath == item.fullpath) {
      // tab is open
      found = true;
    }
  });

  // tab is not open
  return found;
};

const highlightTab = (filePath) => {
  let tabs = document.querySelectorAll("#tablist li button");

  // remove current highlighted tab
  tabs.forEach((tab) => {
    tab.classList.remove("highlighted");
  });

  tabs.forEach((tab) => {
    if (tab.dataset.fullpath === filePath.fullpath) {
      tab.classList.add("highlighted");
    }
  });
};
