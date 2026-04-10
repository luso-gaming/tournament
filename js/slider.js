// Slider Script

let index = 0;

window.addEventListener("DOMContentLoaded", () => {

    const slides = document.querySelector('.slides');
    const slideItems = document.querySelectorAll('.slide');
    const nextBtn = document.querySelector('.next');
    const prevBtn = document.querySelector('.prev');

    if (!slides || slideItems.length === 0) {
        return;
    }

    const totalSlides = slideItems.length;

    function showSlide(i) {
        index = (i + totalSlides) % totalSlides;
        slides.style.transform = `translateX(-${index * 100}%)`;
    }

    // Buttons
    nextBtn?.addEventListener('click', () => showSlide(index + 1));
    prevBtn?.addEventListener('click', () => showSlide(index - 1));

    // Auto slide
    setInterval(() => {
        showSlide(index + 1);
    }, 5000);

});