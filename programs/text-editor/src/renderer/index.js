let filePathsOpen = [];
let filePathActive = null;

window.onload = () => {
  const el = {
    documentName: document.getElementById("documentname"),
    createDocumentBtn: document.getElementById("newfile"),
    openDocumentBtn: document.getElementById("openfile"),
    saveDocumentBtn: document.getElementById("savefile"),
    fileTextarea: document.getElementById("maintext"),
  };

  window.ipc.onFileReady((event, value) => {
    console.log(value.filepath);
    el.documentName.innerHTML = value.filepath.base;
    filePathsOpen.push(value.filepath);
    filePathActive = value.filepath;
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
};
