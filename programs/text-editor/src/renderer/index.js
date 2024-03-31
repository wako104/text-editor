let fileDataList = [];
let filePathActive = null;
let openTabs = [];
let el;

window.onload = () => {
  el = {
    newDocumentBtn: document.getElementById("newfile"),
    openDocumentBtn: document.getElementById("openfile"),
    openFolderBtn: document.getElementById("openfolder"),
    saveDocumentBtn: document.getElementById("savefile"),
    closeDocumentBtn: document.getElementById("closefile"),
    fileTextarea: document.getElementById("maintext"),
    fileList: document.getElementById("filelist"),
    tabList: document.getElementById("tablist"),
  };

  window.ipc.onFileReady((event, value) => {
    if (!fileInList(value.filepath)) {
      fileDataList.push(value);
      addFileToList(value.filepath);
    } else {
      console.log("file in list");
    }
  });

  window.ipc.onFolderReady((event, value) => {
    console.log("folder opened");
    console.log(value);
    addFolder(value.folderPath);
  });

  el.newDocumentBtn.addEventListener("click", () => {
    window.ipc.newFile();
  });

  el.openDocumentBtn.addEventListener("click", () => {
    window.ipc.openFile();
  });

  el.openFolderBtn.addEventListener("click", () => {
    window.ipc.openFolder();
  });

  el.saveDocumentBtn.addEventListener("click", () => {
    content = el.fileTextarea.value;
    window.ipc.saveFile(filePathActive, content);
  });

  el.closeDocumentBtn.addEventListener("click", () => {
    removeFileFromList(filePathActive);
  });
};

//-------------------------------------------------------------------------------------------------
// File Management
//-------------------------------------------------------------------------------------------------

const addFileToList = (filePath) => {
  filePathActive = filePath;
  const listItem = document.createElement("li");
  const listLink = document.createElement("button");
  listLink.textContent = filePath.base;
  listLink.setAttribute("file-path", filePath);
  listLink.addEventListener("click", () => {
    addTab(filePath);
  });
  listItem.appendChild(listLink);
  el.fileList.appendChild(listItem);
};

const removeFileFromList = (filePath) => {
  //remove from file list -------------------------------------- USING FILEPATH.BASE NOT SUFFICIENT
  Array.from(el.fileList.children).forEach((item) => {
    if (item.textContent === filePath.base) {
      item.remove();
    }
  });
  //remove from data list
  fileDataList.forEach((file, index) => {
    if (file.filepath.fullpath === filePath.fullpath) {
      fileDataList.splice(index, 1);
    }
  });
};

const displayFile = (filePath) => {
  let currentFile = null;
  Array.from(fileDataList).forEach((value) => {
    if (value.filepath.fullpath === filePath.fullpath) {
      currentFile = value;
      return;
    }
  });
  el.fileTextarea.value = currentFile.data;
  filePathActive = filePath;
};

const areFilesEqual = (file1, file2) => {
  return file1.fullpath === file2.fullpath;
};

const fileInList = (filePath) => {
  let found = false;
  fileDataList.forEach((file) => {
    if (areFilesEqual(filePath, file.filepath)) {
      found = true;
      return;
    }
  });
  return found;
};

//-------------------------------------------------------------------------------------------------
// Folder Management
//-------------------------------------------------------------------------------------------------

const addFolder = (folderPath) => {
  return;
};

//-------------------------------------------------------------------------------------------------
// Tab Management
//-------------------------------------------------------------------------------------------------

const addTab = (filePath) => {
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

  // set up close button
  closeButton.textContent = "X";
  closeButton.addEventListener("click", (e) => {
    e.stopPropagation();
    closeTab(tabItem, filePath);
  });

  // append tab and close button to tab item
  tabItem.appendChild(tabLink);
  tabItem.appendChild(closeButton);

  // append tab item to tab list
  el.tabList.appendChild(tabItem);

  // add tab to openTabs list
  openTabs.push(filePath);

  // display file
  displayFile(filePath);
};

const closeTab = (tabItem, filePath) => {
  // remove tab item
  tabItem.remove();

  // remove from openTabs list
  openTabs.forEach((tab, index) => {
    if (tab.fullpath === filePath.fullpath) {
      openTabs.splice(index, 1);
    }
  });

  // if no other tabs, display nothing
  if (openTabs.length == 0) {
    filePathActive = null;
    el.fileTextarea.value = "";
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
