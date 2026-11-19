cd /workspace/atqmp
J='[{"skin":{"t":0.9},"worn":{"top":{"id":"tee","c":"#f2f2f0","c2":"#fff","p":0},"jacket":{"id":"varsity","c":"#16171a","c2":"#efe6d6","p":0},"pants":{"id":"cargo","c":"#b9bdc2","c2":"#fff","p":0},"shoes":{"id":"hightop","c":"#17181b","c2":"#f2f2f0","sole":"#f2f2f0","p":0}}}]'
Q=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$J")
node tools/mp/shot.mjs "http://127.0.0.1:5199/tools/mp/dtest.html?k=$1&js=$Q&v=full&d=${2:-3.1}&gap=.5&w=800&h=800&cy=${3:-.85}&ry=${4:-0}" $5 800 800 >/dev/null 2>&1
