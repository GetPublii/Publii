export function fileWebsiteURL(domain, directory, name) {
    try {
        const url = new URL(domain);
        if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
            !['root-files', 'media/files'].includes(directory) || !name || name === '.' || name === '..' || /[/\\\0]/.test(name)) return '';
        const segment = encodeURIComponent(name).replace(/[!'()*]/g, value => '%' + value.charCodeAt(0).toString(16).toUpperCase());
        url.search = '';
        url.hash = '';
        url.pathname = url.pathname.replace(/\/+$/, '') + '/' + (directory === 'media/files' ? 'media/files/' : '') + segment;
        return url.href;
    } catch (_) { return ''; }
}

export function sortFiles(files, field, direction, locale) {
    const collator = new Intl.Collator(locale, { numeric: true, sensitivity: 'base' });
    return files.slice().sort((a, b) => {
        let value = field === 'name' ? collator.compare(a.name, b.name) :
            field === 'size' ? a.size - b.size : new Date(a[field]) - new Date(b[field]);
        if (!value) value = collator.compare(a.name, b.name);
        return direction === 'DESC' ? -value : value;
    });
}
