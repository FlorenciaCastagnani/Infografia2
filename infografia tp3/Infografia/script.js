document.addEventListener('DOMContentLoaded', () => {

    const sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const conPuntero = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const ns = 'http://www.w3.org/2000/svg';

    function crear(tipo, clase, texto) {
        const elemento = document.createElement(tipo);
        if (clase) elemento.className = clase;
        if (texto !== undefined) elemento.textContent = texto;
        return elemento;
    }

    function animarContador(elemento) {

        const destino = parseFloat(elemento.dataset.contador);
        if (Number.isNaN(destino)) return;

        const decimales = parseInt(elemento.dataset.decimales || '0', 10);
        const prefijo = elemento.dataset.prefijo || '';
        const sufijo = elemento.dataset.sufijo || '';
        const duracion = 1500;
        const arranque = performance.now();

        function paso(ahora) {
            const avance = Math.min((ahora - arranque) / duracion, 1);
            const suavizado = 1 - Math.pow(1 - avance, 3);
            const valor = (destino * suavizado).toFixed(decimales).replace('.', ',');
            elemento.textContent = prefijo + valor + sufijo;
            if (avance < 1) requestAnimationFrame(paso);
        }

        requestAnimationFrame(paso);

    }


    const titulo = document.querySelector('.tituloPrincipal');

    if (titulo && !sinMovimiento) {

        const partes = [];

        [...titulo.childNodes].forEach(nodo => {

            if (nodo.nodeType === Node.TEXT_NODE) {

                nodo.textContent.split(/(\s+)/).forEach(trozo => {
                    if (trozo === '') return;
                    if (!trozo.trim()) {
                        partes.push(document.createTextNode(trozo));
                        return;
                    }
                    const palabra = crear('span', 'palabra', trozo);
                    partes.push(palabra);
                });

            } else {

                const palabra = crear('span', 'palabra');
                palabra.appendChild(nodo.cloneNode(true));
                partes.push(palabra);

            }

        });

        titulo.replaceChildren(...partes);

        titulo.querySelectorAll('.palabra').forEach((palabra, indice) => {
            palabra.style.setProperty('--retraso', (indice * 65) + 'ms');
        });

        titulo.classList.add('animado');

    }


    function crearConectores(contenedor, lienzo, pares) {

        const trazos = pares.map(par => {

            const grupo = document.createElementNS(ns, 'g');
            grupo.setAttribute('class', 'trazo');

            const linea = document.createElementNS(ns, 'path');
            linea.setAttribute('class', 'cnx');
            linea.setAttribute('pathLength', '1');

            const punta = document.createElementNS(ns, 'polygon');
            punta.setAttribute('class', 'punta');

            grupo.append(linea, punta);
            lienzo.append(grupo);

            return Object.assign({ grupo, linea, punta }, par);

        });

        function rutaVertical(x1, y1, x2, y2) {

            const medio = (y1 + y2) / 2;
            const dx = x2 - x1;

            if (Math.abs(dx) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;

            const signo = Math.sign(dx);
            const radio = Math.max(0, Math.min(18, Math.abs(dx) / 2, medio - y1, y2 - medio));

            return `M ${x1} ${y1} L ${x1} ${medio - radio}` +
                ` Q ${x1} ${medio} ${x1 + signo * radio} ${medio}` +
                ` L ${x2 - signo * radio} ${medio}` +
                ` Q ${x2} ${medio} ${x2} ${medio + radio}` +
                ` L ${x2} ${y2}`;

        }

        function rutaHorizontal(x1, y1, x2, y2) {

            const medio = (x1 + x2) / 2;
            const dy = y2 - y1;

            if (Math.abs(dy) < 2) return `M ${x1} ${y1} L ${x2} ${y2}`;

            const signoY = Math.sign(dy);
            const signoX = Math.sign(x2 - x1);
            const radio = Math.max(0, Math.min(18, Math.abs(dy) / 2, Math.abs(x2 - x1) / 2));

            return `M ${x1} ${y1} L ${medio - signoX * radio} ${y1}` +
                ` Q ${medio} ${y1} ${medio} ${y1 + signoY * radio}` +
                ` L ${medio} ${y2 - signoY * radio}` +
                ` Q ${medio} ${y2} ${medio + signoX * radio} ${y2}` +
                ` L ${x2} ${y2}`;

        }

        function medir() {

            const base = contenedor.getBoundingClientRect();
            if (base.width === 0) return;

            lienzo.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);

            trazos.forEach(trazo => {

                if (!trazo.desde || !trazo.hasta) return;

                const a = trazo.desde.getBoundingClientRect();
                const b = trazo.hasta.getBoundingClientRect();

                if (a.height < 4 || b.height < 4) {
                    trazo.grupo.setAttribute('visibility', 'hidden');
                    return;
                }

                const vertical = b.top - a.bottom > 26;
                let x1, y1, x2, y2, puntos;

                if (vertical) {

                    x1 = a.left + a.width / 2 - base.left;
                    y1 = a.bottom - base.top;
                    x2 = b.left + b.width / 2 - base.left;
                    y2 = b.top - base.top - 11;

                    if (y2 - y1 < 6) {
                        trazo.grupo.setAttribute('visibility', 'hidden');
                        return;
                    }

                    trazo.linea.setAttribute('d', rutaVertical(x1, y1, x2, y2));
                    puntos = `${x2 - 7},${y2 - 1} ${x2 + 7},${y2 - 1} ${x2},${y2 + 10}`;

                } else {

                    const haciaDerecha = (b.left + b.width / 2) > (a.left + a.width / 2);

                    x1 = (haciaDerecha ? a.right : a.left) - base.left;
                    y1 = a.top + a.height / 2 - base.top;
                    x2 = (haciaDerecha ? b.left - 11 : b.right + 11) - base.left;
                    y2 = b.top + b.height / 2 - base.top;

                    if (Math.abs(x2 - x1) < 10) {
                        trazo.grupo.setAttribute('visibility', 'hidden');
                        return;
                    }

                    trazo.linea.setAttribute('d', rutaHorizontal(x1, y1, x2, y2));

                    const punta = haciaDerecha ? x2 + 11 : x2 - 11;
                    puntos = `${x2},${y2 - 7} ${x2},${y2 + 7} ${punta},${y2}`;

                }

                trazo.grupo.removeAttribute('visibility');
                trazo.punta.setAttribute('points', puntos);

            });

        }

        function dibujar(claves) {
            trazos.forEach(trazo => {
                if (claves.includes(trazo.clave)) trazo.grupo.classList.add('dibujado');
            });
        }

        let siguiendo = false;
        let seguirHasta = 0;

        function seguir(duracion) {

            seguirHasta = Math.max(seguirHasta, performance.now() + duracion);
            if (siguiendo) return;
            siguiendo = true;

            function paso() {
                medir();
                if (performance.now() < seguirHasta) {
                    requestAnimationFrame(paso);
                } else {
                    siguiendo = false;
                }
            }

            requestAnimationFrame(paso);

        }

        if (window.ResizeObserver) {
            const vigilante = new ResizeObserver(() => medir());
            vigilante.observe(contenedor);
            pares.forEach(par => {
                if (par.desde) vigilante.observe(par.desde);
                if (par.hasta) vigilante.observe(par.hasta);
            });
        }

        window.addEventListener('resize', medir);
        window.addEventListener('load', medir);

        if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir);

        medir();

        return { medir, dibujar, seguir };

    }


    let lineaTiempo = null;

    const contenedorTiempo = document.getElementById('lineaTiempo');
    const lienzoTiempo = document.getElementById('conectoresTiempo');

    if (contenedorTiempo && lienzoTiempo) {

        const tarjetas = [...contenedorTiempo.querySelectorAll('.tarjeta')];

        tarjetas.forEach((tarjeta, indice) => {
            tarjeta.dataset.paso = indice;
        });

        if (tarjetas.length > 1) {
            lineaTiempo = crearConectores(contenedorTiempo, lienzoTiempo, tarjetas.slice(0, -1).map((tarjeta, indice) => ({
                clave: 'paso' + indice,
                desde: tarjeta,
                hasta: tarjetas[indice + 1]
            })));
        }

    }


    const graficos = [];

    document.querySelectorAll('[data-grafico]').forEach(nodo => {

        const minimo = parseFloat(nodo.dataset.min);
        const maximo = parseFloat(nodo.dataset.max);
        const salto = parseFloat(nodo.dataset.paso);
        const tabla = nodo.querySelector('.graficoDatos');

        if (!tabla || Number.isNaN(minimo) || Number.isNaN(maximo)) return;

        const rango = maximo - minimo;
        const posicion = valor => ((valor - minimo) / rango) * 100;
        const cero = minimo < 0 ? posicion(0) : 0;

        const globo = crear('div', 'graficoGlobo');
        const series = [];
        const marcas = [];

        [...tabla.querySelectorAll('tbody tr')].forEach(fila => {

            const nombre = fila.querySelector('.graficoNombre').textContent;
            const notaNodo = fila.querySelector('.graficoNota');
            const nota = notaNodo ? notaNodo.textContent : '';
            const bruto = fila.querySelector('td').textContent.trim();
            const valor = parseFloat(bruto.replace('%', '').replace(',', '.'));

            const serie = crear('div', 'graficoSerie');

            const etiqueta = crear('div', 'graficoEtiqueta');
            etiqueta.append(crear('span', 'graficoNombre', nombre));
            if (nota) etiqueta.append(crear('span', 'graficoNota', nota));

            const pista = crear('div', 'graficoPista');

            const rejilla = crear('div', 'graficoRejilla');
            for (let valorMarca = minimo; valorMarca <= maximo + 0.001; valorMarca += salto) {
                const linea = crear('span');
                if (Math.abs(valorMarca) < 0.001) linea.className = 'cero';
                linea.style.setProperty('--x', posicion(valorMarca) + '%');
                rejilla.append(linea);
            }
            pista.append(rejilla);

            const barra = crear('div', 'graficoBarra' + (valor < 0 ? ' negativa' : ''));
            barra.style.setProperty('--inicio', (valor < 0 ? posicion(valor) : cero) + '%');
            barra.style.setProperty('--largo', Math.abs(posicion(valor) - cero) + '%');
            barra.setAttribute('tabindex', '0');
            barra.setAttribute('role', 'img');
            barra.setAttribute('aria-label', nombre + (nota ? ', ' + nota : '') + ': ' + bruto);

            const cifra = crear('span', 'graficoCifra', bruto);
            cifra.dataset.contador = Math.abs(valor);
            cifra.dataset.prefijo = valor < 0 ? '-' : '+';
            cifra.dataset.sufijo = '%';
            barra.append(cifra);

            pista.append(barra);
            serie.append(etiqueta, pista);
            nodo.append(serie);

            function mostrarGlobo() {

                globo.replaceChildren(
                    crear('strong', null, nombre),
                    crear('span', null, (nota ? nota + ' · ' : '') + bruto)
                );

                const cajaGrafico = nodo.getBoundingClientRect();
                const cajaBarra = barra.getBoundingClientRect();

                globo.classList.add('visible');

                const x = (valor < 0 ? cajaBarra.left : cajaBarra.right) - cajaGrafico.left;
                const mitad = globo.offsetWidth / 2;
                const limite = Math.max(mitad + 4, Math.min(x, cajaGrafico.width - mitad - 4));

                globo.style.left = limite + 'px';
                globo.style.top = (cajaBarra.top - cajaGrafico.top) + 'px';

            }

            function ocultarGlobo() {
                globo.classList.remove('visible');
            }

            barra.addEventListener('pointerenter', mostrarGlobo);
            barra.addEventListener('focus', mostrarGlobo);
            barra.addEventListener('pointerleave', ocultarGlobo);
            barra.addEventListener('blur', ocultarGlobo);
            barra.addEventListener('click', evento => {
                evento.stopPropagation();
                if (globo.classList.contains('visible')) ocultarGlobo();
                else mostrarGlobo();
            });

            series.push({ serie, barra, cifra, valor });

        });

        const eje = crear('div', 'graficoEje');
        const listaMarcas = crear('div', 'graficoMarcas');

        for (let valorMarca = minimo; valorMarca <= maximo + 0.001; valorMarca += salto) {
            const marca = crear('span', null, Math.round(valorMarca) + '%');
            marca.style.setProperty('--x', posicion(valorMarca) + '%');
            listaMarcas.append(marca);
            marcas.push({ marca, valor: valorMarca });
        }

        if (listaMarcas.firstElementChild) listaMarcas.firstElementChild.classList.add('primera');
        if (listaMarcas.lastElementChild) listaMarcas.lastElementChild.classList.add('ultima');

        eje.append(listaMarcas);
        nodo.append(eje, globo);

        function ajustar() {

            const ancho = listaMarcas.getBoundingClientRect().width;
            if (ancho === 0) return;

            const aire = 8;
            const puestas = [];

            marcas.forEach(entrada => {
                entrada.marca.hidden = false;
            });

            marcas.forEach((entrada, indice) => {
                const anchoMarca = entrada.marca.getBoundingClientRect().width;
                const x = (posicion(entrada.valor) / 100) * ancho;
                entrada.obligatoria = indice === 0 || indice === marcas.length - 1 || (minimo < 0 && Math.abs(entrada.valor) < 0.001);
                if (indice === 0) entrada.izquierda = x;
                else if (indice === marcas.length - 1) entrada.izquierda = x - anchoMarca;
                else entrada.izquierda = x - anchoMarca / 2;
                entrada.derecha = entrada.izquierda + anchoMarca;
            });

            marcas.forEach(entrada => {

                if (entrada.obligatoria) {
                    while (puestas.length && !puestas[puestas.length - 1].obligatoria && entrada.izquierda - puestas[puestas.length - 1].derecha < aire) {
                        puestas.pop().marca.hidden = true;
                    }
                    puestas.push(entrada);
                    return;
                }

                const previa = puestas[puestas.length - 1];

                if (previa && entrada.izquierda - previa.derecha < aire) {
                    entrada.marca.hidden = true;
                    return;
                }

                puestas.push(entrada);

            });

            series.forEach(entrada => {
                const anchoBarra = entrada.barra.getBoundingClientRect().width;
                const anchoCifra = entrada.cifra.getBoundingClientRect().width;
                entrada.cifra.classList.toggle('afuera', anchoBarra > 0 && anchoCifra + 22 > anchoBarra);
            });

        }

        function dibujarGrafico() {
            series.forEach((entrada, indice) => {
                window.setTimeout(() => {
                    entrada.serie.classList.add('dibujada');
                    window.setTimeout(() => {
                        if (!sinMovimiento) animarContador(entrada.cifra);
                        ajustar();
                    }, 700);
                }, indice * 160);
            });
        }

        window.addEventListener('resize', ajustar);
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(ajustar);
        ajustar();

        graficos.push({ nodo, dibujar: dibujarGrafico, ajustar });

    });

    document.addEventListener('click', () => {
        document.querySelectorAll('.graficoGlobo.visible').forEach(globo => globo.classList.remove('visible'));
    });


    document.querySelectorAll('.user').forEach(grupo => {
        [...grupo.children].forEach((icono, indice) => {
            icono.style.setProperty('--indice', indice);
        });
    });

    document.querySelectorAll('.contenedorTarjetas').forEach(contenedor => {
        [...contenedor.querySelectorAll(':scope > [data-revelar]')].forEach((hijo, indice) => {
            hijo.style.setProperty('--retraso', ((indice % 2) * 130) + 'ms');
        });
    });

    document.querySelectorAll('.contenedorTarjetas2').forEach(contenedor => {
        [...contenedor.querySelectorAll(':scope > [data-revelar]')].forEach((hijo, indice) => {
            hijo.style.setProperty('--retraso', (indice * 110) + 'ms');
        });
    });


    const revelables = document.querySelectorAll('[data-revelar]');

    function revelar(elemento) {

        elemento.classList.add('visible');

        elemento.addEventListener('animationend', evento => {
            if (evento.target !== elemento) return;
            elemento.classList.add('listo');
        });

        if (elemento.dataset.contador) animarContador(elemento);
        elemento.querySelectorAll('[data-contador]').forEach(animarContador);

        if (elemento.classList.contains('tarjetaDato')) elemento.classList.add('llenando');

        if (lineaTiempo && elemento.dataset.paso !== undefined) {
            const indice = parseInt(elemento.dataset.paso, 10);
            if (indice > 0) {
                lineaTiempo.seguir(1000);
                window.setTimeout(() => lineaTiempo.dibujar(['paso' + (indice - 1)]), 120);
            }
        }

        const grafico = graficos.find(entrada => elemento.contains(entrada.nodo));
        if (grafico) window.setTimeout(grafico.dibujar, 200);

    }

    if (sinMovimiento) {

        revelables.forEach(elemento => elemento.classList.add('visible', 'listo'));
        graficos.forEach(entrada => {
            entrada.nodo.querySelectorAll('.graficoSerie').forEach(serie => serie.classList.add('dibujada'));
            entrada.ajustar();
        });
        if (lineaTiempo) lineaTiempo.dibujar(['paso0', 'paso1', 'paso2', 'paso3', 'paso4']);

    } else {

        const observador = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (!entrada.isIntersecting) return;
                revelar(entrada.target);
                observador.unobserve(entrada.target);
            });
        }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });

        revelables.forEach(elemento => observador.observe(elemento));

    }


    const capas = document.querySelectorAll('[data-parallax]');
    const barraProgreso = document.getElementById('barraProgreso');
    const subir = document.getElementById('subir');
    let pendiente = false;

    function actualizar() {

        const desplazamiento = window.scrollY;

        if (!sinMovimiento) {
            capas.forEach(capa => {
                const factor = parseFloat(capa.dataset.parallax) || 0;
                capa.style.setProperty('--desplazamiento', (desplazamiento * factor).toFixed(1) + 'px');
            });
        }

        if (barraProgreso) {
            const total = document.documentElement.scrollHeight - window.innerHeight;
            const avance = total > 0 ? (desplazamiento / total) * 100 : 0;
            barraProgreso.style.width = Math.min(avance, 100) + '%';
        }

        if (subir) {
            subir.classList.toggle('visible', desplazamiento > window.innerHeight * 0.8);
        }

        pendiente = false;

    }

    window.addEventListener('scroll', () => {
        if (pendiente) return;
        pendiente = true;
        requestAnimationFrame(actualizar);
    }, { passive: true });

    actualizar();

    if (subir) {
        subir.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: sinMovimiento ? 'auto' : 'smooth' });
        });
    }


    document.querySelectorAll('.tarjeta').forEach(tarjeta => {

        const flecha = tarjeta.querySelector('.tarjetaFlecha');

        function alternar() {
            const abierta = tarjeta.classList.toggle('abierta');
            if (flecha) flecha.setAttribute('aria-expanded', String(abierta));
            if (lineaTiempo) lineaTiempo.seguir(800);
        }

        tarjeta.addEventListener('click', evento => {
            if (evento.target.closest('a')) return;
            if (evento.target.closest('.tarjetaFlecha')) return;
            alternar();
        });

        if (flecha) {
            flecha.addEventListener('click', evento => {
                evento.stopPropagation();
                alternar();
            });
        }

        if (!conPuntero || sinMovimiento) return;

        tarjeta.addEventListener('pointermove', evento => {
            const caja = tarjeta.getBoundingClientRect();
            const x = (evento.clientX - caja.left) / caja.width;
            const y = (evento.clientY - caja.top) / caja.height;
            tarjeta.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
            tarjeta.style.setProperty('--my', (y * 100).toFixed(1) + '%');
            tarjeta.style.setProperty('--ry', ((x - 0.5) * 6).toFixed(2) + 'deg');
            tarjeta.style.setProperty('--rx', ((0.5 - y) * 5).toFixed(2) + 'deg');
        });

        tarjeta.addEventListener('pointerleave', () => {
            tarjeta.style.setProperty('--rx', '0deg');
            tarjeta.style.setProperty('--ry', '0deg');
        });

    });


    const tarjetaDato = document.getElementById('tarjetaDato');
    const waffle = document.getElementById('waffle');
    const userNota = document.getElementById('userNota');

    if (tarjetaDato && waffle && userNota) {

        const iconos = [...waffle.children];
        const leyendas = { afectado: '3 de cada 10', resto: '7 de cada 10' };

        iconos.filter(icono => icono.dataset.grupo === 'afectado').forEach((icono, indice) => {
            icono.style.setProperty('--orden', indice);
        });

        iconos.forEach(icono => {
            icono.addEventListener('animationend', evento => {
                if (evento.target !== icono || evento.animationName !== 'aparecerIcono') return;
                icono.classList.add('puesto');
            });
        });

        function resaltar(grupo) {

            if (!grupo) {
                delete waffle.dataset.resaltado;
                userNota.classList.remove('visible', 'afectado');
                tarjetaDato.classList.remove('resaltaAfectado', 'resaltaResto');
                return;
            }

            waffle.dataset.resaltado = grupo;
            userNota.textContent = leyendas[grupo];
            userNota.classList.add('visible');
            userNota.classList.toggle('afectado', grupo === 'afectado');
            tarjetaDato.classList.toggle('resaltaAfectado', grupo === 'afectado');
            tarjetaDato.classList.toggle('resaltaResto', grupo === 'resto');

        }

        function reproducir() {
            tarjetaDato.classList.remove('llenando');
            void tarjetaDato.offsetWidth;
            tarjetaDato.classList.add('llenando');
            const numero = tarjetaDato.querySelector('[data-contador]');
            if (numero && !sinMovimiento) animarContador(numero);
        }

        waffle.addEventListener('pointerover', evento => {
            const icono = evento.target.closest('.usuario');
            if (!icono) return;
            resaltar(icono.dataset.grupo);
        });

        waffle.addEventListener('pointerleave', () => resaltar(null));

        waffle.addEventListener('click', evento => {
            const icono = evento.target.closest('.usuario');
            if (!icono) return;
            evento.stopPropagation();
            resaltar(waffle.dataset.resaltado === icono.dataset.grupo ? null : icono.dataset.grupo);
        });

        tarjetaDato.addEventListener('click', reproducir);

    }


    const flujo = document.getElementById('flujo');
    const lienzoFlujo = document.getElementById('conectores');
    const nodoInicial = document.getElementById('nodoInicial');
    const ramas = document.getElementById('ramas');
    const nivelFinal = document.getElementById('nivelFinal');
    const nodoFinal = document.getElementById('nodoFinal');
    const nodosRama = [...document.querySelectorAll('.nodoRama')];

    if (!flujo || !lienzoFlujo || !nodoInicial || nodosRama.length < 2) return;

    const sistemaFlujo = crearConectores(flujo, lienzoFlujo, [
        { clave: 'ramaVerde', desde: nodoInicial, hasta: nodosRama[0] },
        { clave: 'ramaRoja', desde: nodoInicial, hasta: nodosRama[1] },
        { clave: 'finalVerde', desde: nodosRama[0], hasta: nodoFinal },
        { clave: 'finalRoja', desde: nodosRama[1], hasta: nodoFinal }
    ]);

    let ramasAbiertas = false;
    let ramasReveladas = 0;

    nodoInicial.addEventListener('click', () => {

        if (ramasAbiertas) return;
        ramasAbiertas = true;

        ramas.classList.add('visible');
        nodoInicial.classList.add('activado');
        nodoInicial.setAttribute('aria-expanded', 'true');

        sistemaFlujo.seguir(900);
        window.setTimeout(() => sistemaFlujo.dibujar(['ramaVerde', 'ramaRoja']), 90);

        ramas.addEventListener('transitionend', evento => {
            if (evento.propertyName !== 'grid-template-rows') return;
            ramas.classList.add('abierto');
            sistemaFlujo.medir();
        }, { once: true });

    });

    nodosRama.forEach(nodo => {

        nodo.addEventListener('click', () => {

            if (nodo.classList.contains('revelado')) return;

            nodo.classList.add('revelado');
            nodo.setAttribute('aria-expanded', 'true');
            ramasReveladas++;

            sistemaFlujo.seguir(800);

            if (ramasReveladas < nodosRama.length) return;

            nivelFinal.classList.add('visible');
            sistemaFlujo.seguir(1100);
            window.setTimeout(() => sistemaFlujo.dibujar(['finalVerde', 'finalRoja']), 90);

            const contador = nodoFinal.querySelector('[data-contador]');
            if (contador) window.setTimeout(() => animarContador(contador), 420);

        });

    });

});
