# yexp

Query and transform JSON from the terminal with familiar JavaScript-like expressions. Yexp compiles expressions to bytecode and evaluates them without `eval()` or generated JavaScript.

## Run it

Use it once without installing:

```bash
printf '{"name":"Ada","active":true}\n' | npx yexp '.name'
# "Ada"
```

Or install the `yexp` binary globally:

```bash
npm install --global yexp
yexp --version
```

The npm package and executable intentionally share the same name: `yexp`.

## Shell pipelines

Yexp reads JSON from stdin and writes results to stdout. Diagnostics are written to stderr, and color is disabled automatically when stdout is piped.

```bash
curl -s https://api.example.com/users \
  | yexp -c '.users.filter(user => user.active).map(user => user.name)' \
  | gzip > active-users.json.gz
```

Read one or more files instead of stdin:

```bash
yexp '.orders.map(order => order.total) |> add' january.json february.json
```

## JSON streams and NDJSON

Each JSON value is evaluated independently, including newline-delimited JSON:

```bash
printf '{"id":1,"active":true}\n{"id":2,"active":false}\n' \
  | yexp -c '.id'
# 1
# 2
```

Use `--slurp` to collect all input values into one array before evaluation:

```bash
cat events.ndjson | yexp -s '$.map(event => event.type) |> unique'
```

Use `--raw-input` to treat input lines as strings and `--raw-output` to write strings without JSON quotes:

```bash
printf 'Ada\nGrace\n' | yexp -Rr '$.toUpperCase()'
```

## Expressions

The input value is available as `$`. At the command line, a leading `.` is accepted as shorthand for `$.`:

```bash
printf '{"price":12,"quantity":3}\n' | yexp '.price * .quantity'
# 36

printf '{"users":[{"name":"Ada","age":30},{"name":"Linus","age":19}]}\n' \
  | yexp '.users.filter(user => user.age >= 21).map(user => user.name)'
# [
#   "Ada"
# ]
```

Yexp supports arithmetic, comparisons, logical operators, ternaries, property access, optional chaining, arrays, objects, lambdas, and collection functions such as `map`, `filter`, `reduce`, and `groupBy`.

## Options

```text
-c, --compact-output      Write compact JSON
-r, --raw-output          Write strings without JSON quotes
-R, --raw-input           Read each input line as a string
-s, --slurp               Collect all inputs into one array
-n, --null-input          Evaluate once with null input
-e, --exit-status         Exit 1 when the last result is false or null
-j, --join-output         Do not write a newline after each result
-M, --monochrome-output   Disable color output
-f, --file <path>         Read an input file (positional files are preferred)
-h, --help                Show help
-v, --version             Show version
```

Grouped short flags work as expected, such as `-cRr`.

## Exit status

The CLI uses stable exit codes so shell scripts can distinguish failures:

| Code | Meaning |
| ---: | --- |
| `0` | Successful evaluation |
| `1` | Last result was `false` or `null` with `--exit-status` |
| `2` | Invalid CLI usage or internal process failure |
| `3` | Expression failed to compile |
| `4` | Input could not be read or parsed |
| `5` | Expression evaluation failed |

## Filesystem functions

The CLI host adds explicit filesystem functions that are not available in the portable core runtime:

- `glob(pattern)` returns file metadata for matching paths.
- `read(path)` returns a file as a string.
- `lines(path)` returns `{ num, text }` objects.
- `grep(pattern, pathGlob?)` searches matching files.

```bash
yexp -n 'glob("src/**/*.ts").map(file => file.path)'
yexp -n 'grep("TODO", "src/**/*.ts").map(match => match.path) |> unique'
```

These functions give the CLI filesystem authority. The embedded `@cristianmartinez/yexp` runtime does not expose the filesystem by default.

## Scope relative to jq

Yexp aims for jq-grade terminal integration while keeping a familiar expression syntax and a reusable embedded runtime. The CLI processes NDJSON incrementally and has explicit stream framing, shell-safe output, and stable process behavior. Full jq parity is not claimed yet: generator semantics, bounded-memory parsing of pretty-printed single documents and slurped input, and some jq filters still require core language work.

## License

MIT
