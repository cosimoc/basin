const Lang = imports.lang;
const System = imports.system;

const GLib = imports.gi.GLib;
const Gio = imports.gi.Gio;
const Soup = imports.gi.Soup;

const Basin = imports.gi.Basin;

const Incubator = new Lang.Class({
    Name: 'Incubator',

    _init: function (hatch_dir, basin_manifest_path) {
        this._hatch_dir = hatch_dir;
        this._basin_manifest_path = basin_manifest_path;
        this._manifest = this._read_json_file(GLib.build_filenamev([this._hatch_dir, 'hatch_manifest.json']));
        this._sets = this._read_json_file(GLib.build_filenamev([this._hatch_dir, 'hatch_sets.json']));
    },

    _read_json_file: function (path) {
        let file = Gio.File.new_for_path(path);
        if (file.query_exists(null)) {
            let [success, data, tag] = file.load_contents(null);
            return JSON.parse(data);
        } else {
            return null;
        }
    },

    _write_text_file: function (text) {
        let [file, stream] = Gio.File.new_tmp('data_XXXXXX');
        file.replace_contents(text, null, false, 0, null);
        return file.get_path();
    },

    _download_file: function (uri) {
        let input_file = Gio.File.new_for_uri(uri);
        if (input_file.is_native())
            return input_file;

        print('Downloading', uri);
        let session = new Soup.Session();
        let message = Soup.Message.new('GET', uri);
        let input_stream = session.send(message, null);

        if (message.status_code !== 200)
            throw new Error(`Failed to download ${uri} with status ${message.status_code}`);

        let [file, stream] = Gio.File.new_tmp('data_XXXXXX');
        let output_stream = stream.get_output_stream();
        output_stream.splice(input_stream, Gio.OutputStreamSpliceFlags.CLOSE_TARGET, null);

        return file;
    },

    _write_json_file: function (data) {
        return write_text_file(JSON.stringify(data, null, '\t'));
    },

    _find_resources: function (metadata) {
        let ids = Basin.find_resources(metadata['document']);
        return ids.map(id => 'ekn:///' + id);
    },

    _override_resources: function (metadata) {
        return Basin.override_resources(metadata['document']);
    },

    _import_article: function (metadata) {
        let basin_metadata = {};

        basin_metadata['source'] = this._write_text_file(this._override_resources(metadata));
        basin_metadata['@id'] = 'ekn:///' + metadata['assetID'];
        basin_metadata['tags'] = ['EknArticleObject'].concat(metadata['tags']);
        basin_metadata['contentType'] = metadata['contentType'];
        basin_metadata['originalURI'] = metadata['canonicalURI'];
        basin_metadata['matchingLinks'] = metadata['matchingLinks'];
        basin_metadata['title'] = metadata['title'];
        basin_metadata['published'] = metadata['datePublished'];
        basin_metadata['lastModifiedDate'] = metadata['lastModifiedDate'];
        basin_metadata['license'] = metadata['license'];
        basin_metadata['synopsis'] = metadata['synopsis'];
        basin_metadata['authors'] = metadata['authors'];
        basin_metadata['isServerTemplated'] = true;
        basin_metadata['resources'] = this._find_resources(metadata);

        if ('thumbnail' in metadata)
            basin_metadata['thumbnail'] = 'ekn:///' + metadata['thumbnail'];

        return basin_metadata;
    },

    _import_image: function (metadata) {
        let basin_metadata = {};

        basin_metadata['source'] = GLib.build_filenamev([this._hatch_dir, metadata['cdnFilename']]);
        basin_metadata['@id'] = 'ekn:///' + metadata['assetID'];
        basin_metadata['tags'] = ['EknMediaObject'].concat(metadata['tags']);
        basin_metadata['contentType'] = metadata['contentType'];
        basin_metadata['originalURI'] = metadata['canonicalURI'];
        basin_metadata['matchingLinks'] = metadata['matchingLinks'];
        basin_metadata['title'] = metadata['title'];
        basin_metadata['lastModifiedDate'] = metadata['lastModifiedDate'];
        basin_metadata['indexed'] = false;

        return basin_metadata;
    },

    _import_video: function (asset) {
        let basin_metadata = {};

        let file = this._download_file(asset['uri']);
        let info = file.query_info('*', Gio.FileQueryInfoFlags.NONE, null);

        basin_metadata['source'] = file.get_path();
        basin_metadata['@id'] = 'ekn:///' + asset['asset_id'];
        basin_metadata['tags'] = ['EknMediaObject', 'EknArticleObject'];
        basin_metadata['contentType'] = info.get_content_type();
        basin_metadata['originalURI'] = asset['uri'];
        basin_metadata['matchingLinks'] = [asset['uri']];
        basin_metadata['title'] = asset['title'];
        basin_metadata['lastModifiedDate'] = info.get_modification_time().to_iso8601();
        basin_metadata['indexed'] = false;

        return basin_metadata;
    },

    _import_set_thumbnail: function (uri) {
        let basin_metadata = {};

        let file = this._download_file(uri);
        let info = file.query_info('*', Gio.FileQueryInfoFlags.NONE, null);

        basin_metadata['source'] = file.get_path();
        basin_metadata['tags'] = ['EknMediaObject'];
        basin_metadata['contentType'] = info.get_content_type();
        basin_metadata['originalURI'] = uri;
        basin_metadata['matchingLinks'] = [uri];
        basin_metadata['lastModifiedDate'] = info.get_modification_time().to_iso8601();
        basin_metadata['indexed'] = false;

        return basin_metadata;
    },

    _import_set: function (tag) {
        let basin_metadata = {};

        basin_metadata['childTags'] = [tag];
        basin_metadata['tags'] = ['EknSetObject'];
        basin_metadata['title'] = tag;
        basin_metadata['featured'] = false;

        if (this._sets === null)
            return basin_metadata;

        if ('featured-by-default' in this._sets)
            basin_metadata['featured'] = this._sets['featured-by-default'];

        if (tag in this._sets['tags']) {
            let tag_data = this._sets['tags'][tag];
            if ('title' in tag_data)
                basin_metadata['title'] = tag_data['title'];
            if ('thumbnailURI' in tag_data)
                basin_metadata['thumbnail'] = tag_data['thumbnailURI'];
            if ('featured' in tag_data)
                basin_metadata['featured'] = tag_data['featured'];
            if ('tags' in tag_data)
                basin_metadata['tags'] = basin_metadata['tags'].concat(tag_data['tags']);
        }

        if (basin_metadata['featured'])
            basin_metadata['tags'].push('EknHomePageTag');

        return basin_metadata;
    },

    _import_hatch: function () {
        let basin_tags = new Set();
        let basin_manifest = {};
        basin_manifest['content'] = [];
        basin_manifest['sets'] = [];

        this._manifest['assets'].forEach(asset => {
            let metadata = this._read_json_file(GLib.build_filenamev([this._hatch_dir, `${asset['asset_id']}.metadata`]));

            if (metadata['contentType'].startsWith('image')) {
                basin_manifest['content'].push(this._import_image(metadata));
            } else {
                basin_manifest['content'].push(this._import_article(metadata));
            }

            if ('tags' in metadata)
                metadata['tags'].forEach(tag => basin_tags.add(tag));
        });

        [...basin_tags].forEach(tag => {
            let set_metadata = this._import_set(tag);

            if ('thumbnail' in set_metadata) {
                let thumb_metadata = this._import_set_thumbnail(set_metadata['thumbnail']);
                set_metadata['thumbnail'] = thumb_metadata['source'];
                basin_manifest['content'].push(thumb_metadata);
            }

            basin_manifest['sets'].push(set_metadata);
        });

        this._manifest['videos'].forEach(asset => {
            basin_manifest['content'].push(this._import_video(asset));
        });

        return basin_manifest;
    },

    _dump_manifest: function (manifest) {
        let file = Gio.File.new_for_path(this._basin_manifest_path);
        file.replace_contents(JSON.stringify(manifest, null, '\t'), null, false, 0, null);
    },

    run: function () {
        let manifest = this._import_hatch();
        this._dump_manifest(manifest);
    },
});

const USAGE = [
    'usage: basin-incubator <path_to_input_hatch_directory> <path_to_output_manifest>',
    '',
    'Utility that imports a libingester hatch to basin manifest.',
].join('\n');

function main () {
    let argv = ARGV.slice();
    let [hatch_dir, manifest_path] = argv;

    if (argv.length !== 2)
        fail_with_message(USAGE);

   let incubator = new Incubator(hatch_dir, manifest_path);
   incubator.run();
}

function fail_with_message () {
    // join args with space, a la print/console.log
    var args = Array.prototype.slice.call(arguments);
    printerr(args.join(' '));
    System.exit(1);
}
