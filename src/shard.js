const Lang = imports.lang;

const EosShard = imports.gi.EosShard;
const Gio = imports.gi.Gio;

const Shard = new Lang.Class({
    Name: 'Shard',

    _init: function (path) {
        this._file = Gio.File.new_for_path(path);
        this._stream = this._file.replace_readwrite(
            null,
            false,
            Gio.FileCreateFlags.NONE,
            null
        );
        this._out_stream = this._stream.get_output_stream();
        this._writer = new EosShard.WriterV2({ fd: this._out_stream.get_fd()});
    },

    add: function (ekn_hash, content_type, metadata_file, blob_file) {
        let record_id = this._writer.add_record(ekn_hash);

        if (metadata_file) {
            let blob_id = this._writer.add_blob(
                EosShard.V2_BLOB_METADATA,
                metadata_file,
                'application/json',
                EosShard.BlobFlags.COMPRESSED_ZLIB
            );
            this._writer.add_blob_to_record(record_id, blob_id);
        }

        if (blob_file) {
            let blob_id = this._writer.add_blob(
                EosShard.V2_BLOB_DATA,
                blob_file,
                content_type,
                EosShard.BlobFlags.NONE
            );
            this._writer.add_blob_to_record(record_id, blob_id);
        }
    },

    finish: function (self) {
        this._writer.finish();
    },
});
