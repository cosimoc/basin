const System = imports.system;

const Packer = imports.packer;

// For those interested in basin's etymology, it goes roughly like this:
// PDF -> Acrobat -> Charles Blondin -> Niagara Gorge -> Whirlpool Basin

const USAGE = [
    'usage: basin <path_to_input_json> <path_to_output_shard>',
    '',
    'basin shard creation tool for Knowledge Apps.',
].join('\n');

function main () {
    let argv = ARGV.slice();

    if (argv.length !== 2)
        fail_with_message(USAGE);

    let [json_path, shard_path] = argv;
    let packer = new Packer.Packer(json_path, shard_path);
    packer.run();

    print('Sucessfully created', shard_path);
}

function fail_with_message () {
    // join args with space, a la print/console.log
    var args = Array.prototype.slice.call(arguments);
    printerr(args.join(' '));
    System.exit(1);
}
