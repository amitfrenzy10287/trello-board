const templateApp = document.createElement('template');
templateApp.innerHTML = `
  <div id="app">
    <div class="top-bar">
        <div class="title">Trello Like Board</div>
        <div class="search">
          <div class="search-icon"></div>
          <input id="search" type="text" placeholder="search here" />
        </div>
    </div>
    <div id="columns-section">
      <div id="columns-container">
      </div>
      <trello-column-creator></trello-column-creator>
    </div>
  </div>
`;

class TrelloApp extends HTMLElement {
  constructor() {
    super();
    this.columns = [];

    this.fetchData.bind(this);
    this.fetchData();
  }

  connectedCallback() {
    this.appendChild(templateApp.content.cloneNode(true));
    this.$columnCreator = this.querySelector('trello-column-creator');
    this.$columnsContainer = this.querySelector('#columns-container');
    this.$search = this.querySelector('#search');
    this.$columnCreator.addEventListener('columnCreation', this.addColumn.bind(this));
    this.$search.addEventListener('input', this.search.bind(this));
    this._render();
  }

  disconnectedCallback() {}

  search(e) {
    const query = this.$search.value;
    updateSearch(query);
  }

  async fetchData() {
    const columns = await API.get.columns();

    this.columns = columns;

    this.render();
  }

  async addColumn(e) {
    const { title } = e.detail;

    const data = await API.create.column({ title });

    this.columns.push(data);

    this.render();
  }
  
  replaceColumn(e) {
    const newColumn = e.detail;
    const index = this._columns.findIndex(column => column.id === newColumn.id);

    this.columns[index] = newColumn;

    this.render();
  }

  async deleteColumn(e) {
    const columnId = e.detail;
    const index = this.columns.findIndex(column => column.id === columnId);

    this.columns.splice(index, 1);
    this.render();
  }

  render() {
    if (!this.$columnsContainer) return;
    this.$columnsContainer.innerHTML = '';

    this.columns.forEach(({ id, title }, index) => {
      const $item = document.createElement('trello-column');
      $item.setAttribute('id', id);
      $item.setAttribute('title', title);
      $item.index = index;
      $item.addEventListener('columnUpdate', this.replaceColumn.bind(this));
      $item.addEventListener('columnDelete', this.deleteColumn.bind(this));
      this.$columnsContainer.appendChild($item);
    });
  }
}

window.customElements.define('trello-app', TrelloApp);
