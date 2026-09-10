document.addEventListener('DOMContentLoaded', () => {

    const nodoInicial = document.getElementById('nodoInicial');
    const ramas = document.getElementById('ramas');
    const nodoFinal = document.getElementById('nodoFinal');
    const nodosRama = document.querySelectorAll('.nodoRama');

    let ramasReveladas = 0;

    nodoInicial.addEventListener('click', () => {
        ramas.classList.add('visible');
    });

    nodosRama.forEach(nodo => {
        nodo.addEventListener('click', () => {
            if (nodo.classList.contains('revelado')) return;

            nodo.classList.add('revelado');
            ramasReveladas++;

            if (ramasReveladas === nodosRama.length){
                nodoFinal.classList.add('visible');
            }
        });
    });

});