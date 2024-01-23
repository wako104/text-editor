window.onload = () => {
  window.ipc.onFileReady((event, value) => {
    console.log(value);
  });

  document.getElementById("loadfile").addEventListener("click", () => {
    window.ipc.requestFile();
  });
};
