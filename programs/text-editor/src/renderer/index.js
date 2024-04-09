let fileDataList = [];
let filePathActive = null;
let openTabs = [];
let el;

window.onload = () => {
  el = {
    newDocumentBtn: document.getElementById("newfile"),
    saveDocumentBtn: document.getElementById("savefile"),
    closeDocumentBtn: document.getElementById("closefile"),
    fileTextarea: document.getElementById("maintext"),
    folderList: document.getElementById("folderlist"),
    explorer: document.getElementById("exploreritems"),
    tabList: document.getElementById("tablist"),
  };

  window.ipc.onFileReady((_event, value) => {
    handleOpenFile(value);
  });

  window.ipc.onFolderReady((_event, value) => {
    console.log(value);
    addFolder(value);
    addFolderEventListeners();
  });

  window.ipc.onGetFile((_event, _arg) => {
    content = el.fileTextarea.value;
    window.ipc.saveFile(filePathActive, content);
  });

  el.newDocumentBtn.addEventListener("click", () => {
    window.ipc.newFile();
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

const handleOpenFile = (file, parent = el.explorer) => {
  if (!fileInList(file.path)) {
    fileDataList.push(file);
    addFileToList(file, parent);
  } else {
    // if the file is already open in the explorer
    //----------------------------------------------- ASK USER - ARE YOU SURE?
    replaceFileData(file);
  }
};

const addFileToList = (file, parent) => {
  let filePath = file.path;
  filePathActive = filePath;

  // set up file item
  let fileItem = document.createElement("li");

  // set up file link
  let fileLink = document.createElement("button");
  fileLink.textContent = filePath.base;

  // add event listener - add tab - to file
  fileLink.addEventListener("click", () => {
    addTab(filePath);
  });

  // add link to file item
  fileItem.appendChild(fileLink);

  //add file item to it's parent (root folder parent is explorer)
  parent.appendChild(fileItem);
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

const replaceFileData = (file) => {
  fileDataList.forEach((listFile) => {
    if (areFilesEqual(listFile.path, file.path)) {
      console.log(filePathActive);
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
  folderItem.setAttribute("data-type", "folder");

  // set up folder link
  let folderLink = document.createElement("button");
  folderLink.textContent = folderPath.base;

  console.log("link: ", folderLink);
  console.log("item: ", folderItem);
  console.log(parent);

  // add link to folder item
  folderItem.appendChild(folderLink);
  // add folder item to list
  parent.appendChild(folderItem);

  contents.forEach((item) => {
    // if item is a file, add as file
    if (item.type == "file") {
      // ------------------------------------------------------------- find parent through filepath
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
  const folderElements = document.querySelectorAll("[data-type='folder']");
  console.log(folderElements);

  let root = folderElements[0];
  root.addEventListener("click", ({ target }) => {
    let sibling = target.nextElementSibling;

    while (sibling) {
      sibling.style.display = sibling.style.display == "none" ? "block" : "none";
      sibling = sibling.nextElementSibling;
    }
    console.log(target.nextElementSibling);
  });
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
