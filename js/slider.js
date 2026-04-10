document.addEventListener("DOMContentLoaded", () => {

    let index = 0;

    const slides = document.querySelector('.slides');
    const slide = document.querySelector('.slide');
    const totalSlides = document.querySelectorAll('.slide').length;

    const slideWidth = slide.clientWidth;

    function showSlide(i) {
        index = (i + totalSlides) % totalSlides;
        slides.style.transform = `translateX(-${index * slideWidth}px)`;
    }

    document.querySelector('.next').onclick = () => showSlide(index + 1);
    document.querySelector('.prev').onclick = () => showSlide(index - 1);

    setInterval(() => {
        showSlide(index + 1);
    }, 3000);

});