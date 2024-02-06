let filePathsOpen = [];
let fileDataList = [];
let filePathActive = null;

window.onload = () => {
  const el = {
    createDocumentBtn: document.getElementById("newfile"),
    openDocumentBtn: document.getElementById("openfile"),
    saveDocumentBtn: document.getElementById("savefile"),
    closeDocumentBtn: document.getElementById("closefile"),
    fileTextarea: document.getElementById("maintext"),
    fileList: document.getElementById("filelist"),
    tabList: document.getElementById("tablist"),
  };

  window.ipc.onFileReady((event, value) => {
    fileDataList.push(value);
    addFileToList(value.filepath);
    if (!value.data) {
      return;
    }
    el.fileTextarea.value = value.data;
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

  const addFileToList = (filePath) => {
    filePathsOpen.push(filePath);
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
    Array.from(el.fileList.children).forEach((item) => {
      if (item.textContent === filePath.base) {
        item.remove();
      }
    });
  };

  const addTab = (filePath) => {
    const tabItem = document.createElement("li");
    const tabLink = document.createElement("button");
    tabLink.textContent = filePath.base;
    tabLink.addEventListener("click", () => {
      displayFile(filePath);
    });
    tabItem.appendChild(tabLink);
    el.tabList.appendChild(tabItem);
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
};
