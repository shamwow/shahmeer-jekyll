---
---

window.onload = function() {
  var siteNav = document.querySelector('.site-nav-wrapper');
  var set = false;
  window.onscroll = function() {
    if (window.pageYOffset < 200 && set) {
      siteNav.className = "wrapper site-nav-wrapper";
      set = false;
    }
    else if (window.pageYOffset >= 200 && !set) {
      siteNav.className = "wrapper site-nav-wrapper site-nav-wrapper--scrolled";
      set = true;
    }
  };
};
