$(document).ready(function() {
  /*
   * Cache DOM elements for better performance
   */
  const $input = $("#input");
  const $tabs = $("#tabs li");
  const $inputPasswordWrapper = $("#input-password-wrapper");
  const $buttons2 = $(".buttons-2");
  const $screen1 = $("#screen-1");
  const $screen2 = $("#screen-2");


  /*
   * Events registration
  */
  $input.on("keyup change", function () {
      hasher.update();
  });

  // Open separate window (pop-out)
  $("#button-popout").click(function () {
  if (typeof chrome.extension != "undefined") {
      chrome.tabs.create({
      url: 'popup.html'
      });
  }
  });

  // Click on tab (Hash/HMAC/...)
  $tabs.click(function () {
      // highlight active tab, remove highlight on everything else
      $tabs.removeClass("on");
      $(this).addClass("on");

      // show/hide optional fields
      if (tabs[this.id] == tabs.hmac || tabs[this.id] == tabs.cipher) {
          $inputPasswordWrapper.show();
      } else {
          $inputPasswordWrapper.hide();
      }

      hasher.tab = tabs[this.id];
      hasher.init();
      hasher.update();
      $("#input-value").focus();
  });
  
  /*
   * Animations (using CSS transitions instead of jQuery animate)
   */
  $buttons2.on("mouseenter", function(){
      $(this).addClass("hovered");
  });
  
  $buttons2.on("mouseleave", function(){
      $(this).removeClass("hovered");
  });

  /*
   * Hash navigation
   */
  const onHashChange = function () {
      const hash = window.location.hash.slice(1);
      $(".screens").hide();
      if (hash === "info") {
          $screen2.show().scrollTop();
      } else {
          $screen1.show().scrollTop();
      }
  };

  $(window).on('hashchange', onHashChange);  

  /*
   * Init
   */
  onHashChange();
  hasher.init();
  hasher.update();
  
  // Focus hack, see http://stackoverflow.com/a/11400653/1295557
  if (location.search != "?focusHack") location.search = "?focusHack";
  window.scrollTo(0, 0);
});