const Lang = imports.lang;

const EosShard = imports.gi.EosShard;
const Gio = imports.gi.Gio;

var Links = new Lang.Class({
    Name: 'Links',

    _init: function () {
        this._links = new Map();
    },

    add(link, id) {
        this._links.set(link, id);
    },

    finish: function () {
        let links = [...this._links.keys()];
        let [file, stream] = Gio.File.new_tmp('links_XXXXXX');
        let out_stream = stream.get_output_stream();

        let dict = EosShard.DictionaryWriter.new_for_stream(out_stream, links.length);
        dict.begin();
        links.sort().forEach((link) => {
            dict.add_entry(link, this._links.get(link));
        });
        dict.finish();
        return file;
    },
});
