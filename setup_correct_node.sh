NODEVERSION=20
export PATH="/opt/homebrew/opt/node@${NODEVERSION}/bin:$PATH"
export LDFLAGS="-L/opt/homebrew/opt/node@${NODEVERSION}/lib"
export CPPFLAGS="-I/opt/homebrew/opt/node@${NODEVERSION}/include"
