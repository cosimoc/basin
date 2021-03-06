const Lang = imports.lang;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;

const Index = imports.index;
const Links = imports.links;
const Shard = imports.shard;

const EKN_PREFIX = 'ekn:///';

var Packer = new Lang.Class ({
    Name: 'Packer',

    _init: function (json_path, shard_path) {
        let json_file = Gio.File.new_for_path(json_path);
        let [success, data, tag] = json_file.load_contents(null);
        this._json = JSON.parse(data);

        this._shard = new Shard.Shard(shard_path);
        this._index = new Index.Index();
        this._links = new Links.Links();
    },

    run: function () {
        print('Writing content');
        if (this._json['content'])
            this._json['content'].forEach(this._add_content, this);

        print('Writing sets');
        if (this._json['sets'])
            this._json['sets'].forEach(this._add_set, this);

        print('Writing links');
        let links_hash = this._hashify('link-table');
        let links_file = this._links.finish();
        this._shard.add(links_hash, 'application/x-endlessm-dictionary', null, links_file);

        print('Writing index');
        let index_hash = this._hashify('xapian-db');
        let index_file = this._index.finish();
        this._shard.add(index_hash, 'application/x-endlessm-xapian-db', null, index_file);

        this._shard.finish();
    },

    _get_object_type: function (mime_type) {
        const article_mime_types = [
            'application/pdf',
            'application/x-kolibri-html5-zip',
            'text/html'
        ];

        if (article_mime_types.includes(mime_type)) {
            return 'ekn://_vocab/ArticleObject';

        } else if (mime_type.startsWith('video')) {
            return 'ekn://_vocab/VideoObject';

        } else if (mime_type.startsWith('audio')) {
            return 'ekn://_vocab/AudioObject';

        } else if (mime_type.startsWith('image')) {
            return 'ekn://_vocab/ImageObject';

        } else {
            throw new Error('Object type is not supported', mime_type);
        }
    },

    _hashify: function (string) {
        return GLib.compute_checksum_for_string(GLib.ChecksumType.SHA1, string, -1);
    },

    _dump_to_file: function (data) {
        let [file, stream] = Gio.File.new_tmp('data_XXXXXX');
        file.replace_contents(JSON.stringify(data), null, false, 0, null);
        return file;
    },

    _add_content: function (metadata) {
        let content_hash;

        if ('@id' in metadata) {
            content_hash = metadata['@id'].replace(EKN_PREFIX, '');
        } else {
            content_hash = this._hashify(metadata['source']);
            metadata['@id'] =  EKN_PREFIX + content_hash;
        }

        metadata['@type'] = this._get_object_type(metadata['contentType']);

        let metadata_file = this._dump_to_file(metadata);
        let content_file = Gio.File.new_for_path(metadata['source']);

        this._shard.add(content_hash, metadata['contentType'], metadata_file, content_file);

        if (!('indexed' in metadata) || metadata['indexed'])
            this._index.add(metadata);

        if (metadata['matchingLinks']) {
            metadata['matchingLinks'].forEach((link) => {
                this._links.add(link, metadata['@id']);
            });
        }
    },

    _add_set: function (metadata) {
        let set_hash;

        if ('@id' in metadata) {
            set_hash = metadata['@id'].replace(EKN_PREFIX, '');
        } else {
            set_hash = this._hashify(metadata['title']);
            metadata['@id'] =  EKN_PREFIX + set_hash;
        }

        metadata['@type'] = 'ekn://_vocab/SetObject';

        if ('thumbnail' in metadata)
            metadata['thumbnail'] = 'ekn:///' + this._hashify(metadata['thumbnail']);

        let metadata_file = this._dump_to_file(metadata);

        this._shard.add(set_hash, null, metadata_file, null);
        this._index.add(metadata);
    },
});
