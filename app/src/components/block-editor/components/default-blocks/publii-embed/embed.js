let embedHelper = {
  isEmbedable (code) {
    if (embedHelper.getService(code)) {
      return true;
    }

    if (embedHelper.isUrl(code)) {
      return true;
    }

    return false;
  },
  embed (code) {
    let service = embedHelper.getService(code);
    let iframeCode = embedHelper.createIframe(service, code);
    return iframeCode;
  },
  isUrl (code) {
    if (code.substr(0, 8) === 'https://' || code.substr(0, 7) === 'http://') {
      return true;
    }

    return false;
  },
  getService (code) {
    if (code.substr(0, 8) === 'https://' && code.indexOf('youtube.com') > -1) {
      return 'youtube';
    }

    if (code.substr(0, 8) === 'https://' && code.indexOf('vimeo.com') > -1) {
      return 'vimeo';
    }

    return false;
  },
  createIframe (service, code) {
    switch (service) {
      case 'youtube':
        return embedHelper.youtubeIframe(code);
      case 'vimeo':
        return embedHelper.vimeoIframe(code);
      default:
        return embedHelper.rawIframe(code);
    }
  },
  youtubeIframe (code) {
    let url = code;
    let queryParams = new URLSearchParams(url.split('?')[1]);

    if (queryParams.has('v')) {
      url = 'https://www.youtube.com/embed/' + queryParams.get('v') + '?feature=oembed';
    }

    return '<iframe src="' + url + '" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>';
  },
  vimeoIframe (code) {
    let url = code.replace('https://vimeo.com/', '');
    url = 'https://player.vimeo.com/video/' + url;

    return '<iframe src="' + url + '" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>';
  },
  rawIframe (code) {
    return '<iframe width="100%" height="500" src="' + code + '" frameborder="0"></iframe>';
  }
};

export default embedHelper;
