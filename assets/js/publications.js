function updatePublicationCounts(root) {
  (root || document).querySelectorAll(".publication-section").forEach(function (section) {
    var count = section.querySelectorAll(".publication-list > .publication").length;
    var label = section.querySelector(".publication-section__count");
    if (label) label.textContent = count + (count === 1 ? " paper" : " papers");
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () { updatePublicationCounts(document); });
} else {
  updatePublicationCounts(document);
}
