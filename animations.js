(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var targets = document.querySelectorAll(
    '.seam, .card, .pillar, .step, .commitments li, .faq details, .price-line'
  );

  if (!('IntersectionObserver' in window) || reduceMotion) {
    targets.forEach(function (el) { el.classList.add('in-view'); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  targets.forEach(function (el) { observer.observe(el); });
})();

(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fineHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (reduceMotion || !fineHover) return;

  var targets = document.querySelectorAll('.card, .pillar, .step, .commitments li, .price-line');
  var LIFT = { CARD: 'translateY(-4px) ' };

  targets.forEach(function (el) {
    el.style.willChange = 'transform';
    var raf = null;
    var lift = el.classList.contains('card') ? LIFT.CARD : '';

    el.addEventListener('pointerenter', function (e) {
      if (e.pointerType !== 'mouse') return;
      el.style.transition = 'none';
    });

    el.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var rect = el.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rx = (0.5 - py) * 9;
      var ry = (px - 0.5) * 9;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        el.style.transform = 'perspective(700px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) ' + lift + 'scale3d(1.015,1.015,1.015)';
        raf = null;
      });
    });

    el.addEventListener('pointerleave', function (e) {
      if (e.pointerType !== 'mouse') return;
      el.style.transition = 'transform 450ms cubic-bezier(.22,.9,.3,1)';
      el.style.transform = '';
    });
  });
})();

(function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  function closeNav() {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }

  toggle.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  nav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 760) closeNav();
  });
})();
