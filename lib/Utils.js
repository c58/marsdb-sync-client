export class Utils {
  // @ngInject
  constructor(AppSettings) {
    this.AppSettings = AppSettings;
  }

  domain() {
    const domainRegexp = /(?:http(?:s?):\/\/)?((?:[\w]+\.){1}(?:[\w]+\.?)+)/g;
    const match = domainRegexp.exec(this.AppSettings.baseUrl);
    if (!match) {
      throw new Error('AppSettings.baseUrl don\'t contains a domain');
    }
    return match[1];
  }

  absoluteUrl(path, params) {
    var url = this.AppSettings.baseUrl;

    // url starts with 'http://' or 'https://''
    if (!/^http[s]?:\/\//i.test(url)) {
      url = 'https://' + url; // we will later fix to https if options.secure is set
    }

    // url ends with '/'
    if (!/\/$/.test(url)) {
      url += '/';
    }

    if (path) {
      // path starts not with '/'
      if (/^\//.test(path)) {
        path = path.substr(1);
      }
      url += path;
    }

    return url;
  }
}
