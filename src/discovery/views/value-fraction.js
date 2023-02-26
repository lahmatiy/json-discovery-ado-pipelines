/* eslint-env browser */

const delim = '<span class="num-delim"></span>';

function formatValue(value, unit) {
    const number =
        value === 0
            ? 0
            : value >= 1000
                ? (value % 1 ? value.toFixed(1) : String(value)).replace(
                    /\..+$|\B(?=(\d{3})+(\D|$))/g,
                    m => m || delim
                )
                : value % 1
                    ? value.toFixed(1)
                    : String(value);

    return unit ? `${number}${delim}${unit}` : number;
}

export default discovery => {
    discovery.view.define('value-fraction', function(el, config, { value, format, unit, total }) {
        const valueEl = document.createElement('span');

        valueEl.className = 'value';
        valueEl.innerHTML =
          typeof format === 'function' ? format(value) : formatValue(value, unit);

        el.append(valueEl);

        const fractionEl = document.createElement('span');
        const fraction = (100 * value) / total;

        fractionEl.className = 'fraction';
        fractionEl.innerText =
            fraction === 0
                ? ''
                : fraction < 0.1
                    ? '<0.1%'
                    : fraction >= 99.9
                        ? `${Math.round(fraction)}%`
                        : `${fraction.toFixed(1)}%`;

        el.append(fractionEl);
    });
};
