let filePathsOpen = [];
let filePathActive = null;

window.onload = () => {
  const el = {
    documentName: document.getElementById("documentname"),
    createDocumentBtn: document.getElementById("newfile"),
    openDocumentBtn: document.getElementById("openfile"),
    saveDocumentBtn: document.getElementById("savefile"),
    closeDocumentBtn: document.getElementById("closefile"),
    fileTextarea: document.getElementById("maintext"),
    filesOpen: document.getElementById("openfileslist"),
  };

  window.ipc.onFileReady((event, value) => {
    console.log(value.filepath);
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
    el.documentName.innerHTML = filePath.base;
    filePathsOpen.push(filePath);
    filePathActive = filePath;
    let listItem = document.createElement("li");
    listItem.textContent = filePath.base;
    el.filesOpen.appendChild(listItem);
  };

  const removeFileFromList = (filePath) => {
    Array.from(el.filesOpen.children).forEach((item) => {
      if (item.textContent === filePath.base) {
        item.remove();
      }
    });
  };
};
