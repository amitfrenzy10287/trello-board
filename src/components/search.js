window.__SEARCH = '';
const searchObservers = [];
const updateSearch = value => {
  window.__SEARCH = value;
  searchObservers.forEach(observer => {
    observer(value);
  });
};

const subscribeToSearch = func => searchObservers.push(func) - 1;
