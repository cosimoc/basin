const Lang = imports.lang;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Xapian = imports.gi.Xapian;

const SEQUENCE_NUMBER_VALUE_NO = 0;
const EXACT_TITLE_PREFIX = 'XEXACTS';
const TITLE_PREFIX = 'S';
const TAG_PREFIX = 'K';
const ID_PREFIX = 'Q';

const DEFAULT_WEIGHT = 1;
const EXACT_WEIGHT = 27;

var Index = new Lang.Class({
    Name: 'Index',

    _init: function () {
        let db_dir = GLib.dir_make_tmp('db_dir_XXXXXX');
        let prefixes = {
            'prefixes': [
                {
                    'field':  'exact_title',
                    'prefix': EXACT_TITLE_PREFIX,
                },
                {
                    'field':  'title',
                    'prefix': TITLE_PREFIX,
                },
            ],
            'booleanPrefixes': [
                {
                    'field': 'tag',
                    'prefix': TAG_PREFIX,
                },
                {
                    'field': 'id',
                    'prefix': ID_PREFIX,
                },
            ],
        };

        this._db = new Xapian.WritableDatabase({
            path: db_dir,
            action: Xapian.DatabaseAction.CREATE_OR_OVERWRITE,
            backend: Xapian.DatabaseBackend.GLASS,
        });
        this._db.init(null);
        this._db.set_metadata('XbPrefixes', JSON.stringify(prefixes));

        // stopwords field is required so leave it empty for now
        this._db.set_metadata('XbStopwords', JSON.stringify([]));

        this._termgenerator = new Xapian.TermGenerator();
        this._termgenerator.set_database(this._db);
    },

    add: function (metadata) {
        let exact_title = metadata['title'].toLocaleLowerCase().replace('-', '_').replace(' ', '_');

        let doc = new Xapian.Document();
        doc.set_data(metadata['@id']);
        doc.add_boolean_term(ID_PREFIX + metadata['@id']);
        doc.add_term_full(EXACT_TITLE_PREFIX + exact_title, EXACT_WEIGHT);

        metadata['tags'].forEach((tag) => {
            doc.add_boolean_term(TAG_PREFIX + tag);
        });

        if ('sequenceNumber' in metadata && metadata['sequenceNumber'] >= 0) {
            doc.add_numeric_value(SEQUENCE_NUMBER_VALUE_NO, metadata['sequenceNumber']);
        }

        this._termgenerator.set_document(doc);
        this._termgenerator.index_text_full(metadata['title'], DEFAULT_WEIGHT, TITLE_PREFIX);
        this._termgenerator.index_text_full(metadata['title'], DEFAULT_WEIGHT, '');

        this._db.add_document(doc);
    },

    finish: function () {
        let [file, stream] = Gio.File.new_tmp('db_XXXXXX');
        let out_stream = stream.get_output_stream();

        this._db.commit();
        this._db.compact_to_fd(out_stream.get_fd(), Xapian.DatabaseCompactFlags.SINGLE_FILE);
        this._db.close();

        return file;
    },
});
