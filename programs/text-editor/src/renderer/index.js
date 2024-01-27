window.onload = () => {
  const el = {
    documentName: document.getElementById("documentname"),
    createDocumentBtn: document.getElementById("createfile"),
    openDocumentBtn: document.getElementById("openfile"),
    fileTextarea: document.getElementById("maintext"),
  };

  window.ipc.onFileReady((event, value) => {
    el.documentName.innerHTML = value.filename;
    el.fileTextarea.value = value.data;
  });

  el.createDocumentBtn.addEventListener("click", () => {
    window.ipc.createFile();
  });

  el.openDocumentBtn.addEventListener("click", () => {
    window.ipc.requestFile();
  });
};
