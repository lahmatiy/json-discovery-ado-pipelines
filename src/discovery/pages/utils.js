export function nextMonth(prev, next) {
    if (prev === '0000-00') {
        return next;
    }

    const [y, m] = prev.split('-');

    if (m === '12') {
        return `${Number(y) + 1}-01`;
    }

    return `${y}-${String(Number(m) + 1).padStart(2, '0')}`;
}

export function labelMonth(value, idx) {
    const [year, month] = value.split('-');

    if (!month) {
        return value;
    }

    if (value === '0000-00') {
        return 'init';
    }

    const monthStr = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ][Number(month) - 1];

    return `${monthStr}, ${year}`;
}
