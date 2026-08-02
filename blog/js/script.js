document.addEventListener('DOMContentLoaded', function () {
  var posts = document.querySelectorAll('.post-preview');

  posts.forEach(function (post, index) {
    setTimeout(function () {
      post.classList.add('is-visible');
    }, index * 180);
  });
});
