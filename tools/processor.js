const Lang = imports.lang;
const System = imports.system;

const Gio = imports.gi.Gio;

const Processor = new Lang.Class({
    Name: 'Processor',

    _init: function (dir_path) {
        this._dir_path = dir_path;
        this._sequence = 0;
    },

    _create_root: function () {
        return {
            'articles': [],
            'images': [],
            'sets': [],
        };
    },

    _create_article: function (path, title, mime_type, category, sequence) {
        let tags = ['EknArticleObject'];

        if (category)
            tags.push(category);

        return {
            'contentType': mime_type,
            'source': path,
            'tags': tags,
            'title': title,
            'sequenceNumber': sequence,
        };
    },

    _create_video: function (path, title, mime_type, category, sequence) {
        let license = '';
        let width = 0;
        let height = 0;
        let duration = 0;
        let tags = ['EknMediaObject', 'EknArticleObject'];

        if (category)
            tags.push(category);

        return {
            'contentType': mime_type,
            'source': path,
            'tags': tags,
            'title': title,
            'sequenceNumber': sequence,
            'height': height,
            'width': width,
            'license': license,
            'duration': duration,
        };
    },

    _create_image: function (path, mime_type) {
        let tags = ['EknMediaObject'];
        let license = '';
        let width = 0;
        let height = 0;

        return {
            'contentType': mime_type,
            'license': license,
            'tags': tags,
            'height': height,
            'width': width,
            'source': path,
        };
    },

    _create_set: function (title, child_tags, tags, thumbnail_path) {
        let _tags = ['EknSetObject'];
        let featured = false;

        if (tags.length === 0) {
            _tags.push('EknHomePageTag');
            featured = true;
        }

        _tags = _tags.concat(tags);

        return {
            'childTags': child_tags,
            'tags': _tags,
            'featured': featured,
            'thumbnail': thumbnail_path,
            'title': title,
        };
    },

    _convert_recursive: function (dir_path, categories, output) {
        let directory = Gio.File.new_for_path(dir_path);
        let enumerator = directory.enumerate_children('*', Gio.FileQueryInfoFlags.NONE, null);
        let info = enumerator.next_file(null);

        while (info !== null) {
            let file = enumerator.get_child(info);
            let file_type = info.get_file_type();
            let mime_type = info.get_content_type();
            let path = file.get_path();
            let name = info.get_name().split('.')[0];

            if (file_type === Gio.FileType.DIRECTORY) {
                let _categories = categories.slice(0);
                _categories.push(name);

                this._convert_recursive(path, _categories, output);

                let tags = [];
                if (categories.length > 0)
                    tags = [categories[categories.length - 1]];

                let thumbnail_path = path + '/thumbnail.jpg';

                output['sets'].push(this._create_set(name, [name], tags, thumbnail_path));

            } else if (mime_type.startsWith('image')) {
                output['images'].push(this._create_image(path, mime_type));

            } else if (mime_type === 'application/pdf') {
                this._sequence += 1;

                let category = null;
                if (categories.length > 0)
                    category = categories[categories.length - 1];

                output['articles'].push(this._create_article(path, name, mime_type, category, this._sequence));

            } else if (mime_type.startsWith('video')) {
                this._sequence += 1;

                let category = null;
                if (categories.length > 0)
                    category = categories[categories.length - 1];

                output['articles'].push(this._create_video(path, name, mime_type, category, this._sequence));

            } else {
               print('Ignoring file', file.get_path());
            }

            info = enumerator.next_file(null);
        }
    },

    run: function () {
        let output_dict = this._create_root();
        let directories = [];

        this._convert_recursive(this._dir_path, directories, output_dict);

        return output_dict;
    },
});

const USAGE = [
    'usage: basin-processor <path_to_input_directory> <path_to_output_json>',
    '',
    'Utility that processes a directory to create the JSON input file for basin.',
].join('\n');

function main () {
    let argv = ARGV.slice();

    if (argv.length !== 2)
        fail_with_message(USAGE);

    let [dir_path, json_path] = argv;
    let processor = new Processor(dir_path, json_path);
    let output_dict  = processor.run();
    let output_json = JSON.stringify(output_dict, null, '\t');

    let output_file = Gio.File.new_for_path(json_path);
    output_file.replace_contents(output_json, null, false, 0, null);

    print('Sucessfully created', json_path);
}

function fail_with_message () {
    // join args with space, a la print/console.log
    var args = Array.prototype.slice.call(arguments);
    printerr(args.join(' '));
    System.exit(1);
}
