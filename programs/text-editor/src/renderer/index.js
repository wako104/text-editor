let fileDataList = [];
let filePathActive = null;
let el;

window.onload = () => {
  el = {
    createDocumentBtn: document.getElementById("newfile"),
    openDocumentBtn: document.getElementById("openfile"),
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

  el.createDocumentBtn.addEventListener("click", () => {
    window.ipc.createFile();
  });

  el.openDocumentBtn.addEventListener("click", () => {
    window.ipc.openFile();
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
  listLink.addEventListener("click", () => {
    addTab(filePath);
  });
  listItem.appendChild(listLink);
  el.fileList.appendChild(listItem);
};

const removeFileFromList = (filePath) => {
  //remove from file list
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
    if (value.filepath.base === filePath.base) {
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
// Tab Management
//-------------------------------------------------------------------------------------------------

const addTab = (filePath) => {
  const tabItem = document.createElement("li");
  const tabLink = document.createElement("button");
  tabLink.textContent = filePath.base;
  tabLink.addEventListener("click", () => {
    displayFile(filePath);
    filePathActive = filePath;
  });
  tabItem.appendChild(tabLink);
  el.tabList.appendChild(tabItem);
};
