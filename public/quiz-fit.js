function fitViewport(){
  var vv = window.visualViewport;
  var h = Math.round((vv && vv.height) ? vv.height : (window.innerHeight || document.documentElement.clientHeight));
  document.documentElement.style.setProperty("--app-h", h + "px");
}
fitViewport();
window.addEventListener("resize", fitViewport);
window.addEventListener("orientationchange", fitViewport);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", fitViewport);
  window.visualViewport.addEventListener("scroll", fitViewport);
}
