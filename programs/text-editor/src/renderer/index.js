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
    folderList: document.getElementById("folderlist"),
    explorer: document.getElementById("explorer"),
    tabList: document.getElementById("tablist"),
  };

  window.ipc.onFileReady((event, value) => {
    if (!fileInList(value.path)) {
      fileDataList.push(value);
      addFileToList(value.path);
    } else {
      // ---------------------------------- REPLACE FILELIST VALUE WITH DATA
      console.log("file in list");
    }
  });

  window.ipc.onFolderReady((event, value) => {
    console.log(value);
    addFolder(value);
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
  el.explorer.appendChild(listItem);
};

const removeFileFromList = (filePath) => {
  //remove from file list -------------------------------------- USING FILEPATH.BASE NOT SUFFICIENT
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
  let currentFile = null;
  fileDataList.forEach((value) => {
    if (value.path.fullpath === filePath.fullpath) {
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
    if (areFilesEqual(filePath, file.path)) {
      found = true;
      return;
    }
  });
  return found;
};

//-------------------------------------------------------------------------------------------------
// Folder Management
//-------------------------------------------------------------------------------------------------

const addFolder = (folder) => {
  folderPath = folder.path;
  contents = folder.data;
  folderItem = document.createElement("li");
  folderLink = document.createElement("button");

  // set up folder link
  folderLink.textContent = folderPath.base;

  // add link to folder item
  folderItem.appendChild(folderLink);

  // add folder item to list
  el.explorer.appendChild(folderItem);

  contents.forEach((item) => {
    // if item is a file, add as file
    if (item.type == "file") {
      if (!fileInList(item.path)) {
        fileDataList.push(item);
        addFileToList(item.path);
      } else {
        // ---------------------------------- REPLACE FILELIST VALUE WITH DATA
        console.log("file in list");
      }
    }

    // if item is a folder, use recursion
    if (item.type == "folder") {
      addFolder(item);
    }
  });

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
