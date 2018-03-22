const Lang = imports.lang;

const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
imports.gi.versions.Xapian = '2.0';
const Xapian = imports.gi.Xapian;

const SEQUENCE_NUMBER_VALUE_NO = 0;
const PUBLISHED_DATE_VALUE_NO = 1;
const ALPHABETICAL_VALUE_NO = 2;

const CONTENT_TYPE_PREFIX = 'T';
const EXACT_TITLE_PREFIX = 'XEXACTS';
const TITLE_PREFIX = 'S';
const TAG_PREFIX = 'K';
const ID_PREFIX = 'Q';

const DEFAULT_WEIGHT = 1;
const EXACT_WEIGHT = 27;

/* Try the publication date first and if that fails,
 * the last modification date. */
function _indexDateForMetadata(metadata) {
    if ('published' in metadata)
        return metadata['published'];
    else if ('lastModifiedDate' in metadata)
        return metadata['lastModifiedDate'];

    return null;
}

var Index = new Lang.Class({
    Name: 'Index',

    _init: function () {
        let db_dir = GLib.dir_make_tmp('db_dir_XXXXXX');
        let prefixes = {
            'prefixes': [
                {
                    'field':  'content_type',
                    'prefix': CONTENT_TYPE_PREFIX,
                },
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
            backend: Xapian.DatabaseBackend.HONEY,
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
        let content_type = metadata['contentType'];

        let doc = new Xapian.Document();
        doc.set_data(metadata['@id']);
        doc.add_boolean_term(ID_PREFIX + metadata['@id']);
        doc.add_term_full(EXACT_TITLE_PREFIX + exact_title, EXACT_WEIGHT);
        doc.add_term_full(CONTENT_TYPE_PREFIX + content_type, DEFAULT_WEIGHT);

        metadata['tags'].forEach((tag) => {
            doc.add_boolean_term(TAG_PREFIX + tag);
        });

        if ('sequenceNumber' in metadata && metadata['sequenceNumber'] >= 0) {
            doc.add_numeric_value(SEQUENCE_NUMBER_VALUE_NO, metadata['sequenceNumber']);
        }

        const indexingDateString = _indexDateForMetadata(metadata);
        if (indexingDateString) {
            /* Parse the date using the native JS Date library, since
             * GLib.Date.set_parse isn't able to handle JS-style dates. */
            try {
                const parsedIndexingDate = new Date(indexingDateString);
                const timestamp = Number(GLib.DateTime.new_from_unix_utc(Math.floor(parsedIndexingDate / 1000))
                                                      .format("%Y%m%d%H%M%S"));

                doc.add_numeric_value(PUBLISHED_DATE_VALUE_NO, timestamp);
            } catch (e) {
                log(`Could not parse ${indexingDateString}: ${e} ` +
                    `, ${metadata['@id']} will not be date-sortable`);
            }
        }

        if (metadata['title'])
            doc.add_value(ALPHABETICAL_VALUE_NO, metadata['title']);

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
