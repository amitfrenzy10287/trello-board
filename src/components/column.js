const templateColumn = document.createElement('template');
templateColumn.innerHTML = `
  <div class="column-wrapper">
    <div class="column">
      <div class="column-header">
        <h2></h2>
        <div class="column-edit-button"></div>
        <div class="column-delete-button"></div>
        <input hidden class="column-header column-header-input"/>
        <button hidden class="primary column-save-button">Save</button>
      </div>
      <div class="cards cards-container"></div>
      <div class="cards">
        <trello-card-creator></trello-card-creator>
      </div>
    </div>
  </div>
`;

class TrelloColumn extends HTMLElement {
  constructor() {
    super();

    // initial state
    this._id = this.getAttribute('id') || null;
    this._title = this.getAttribute('title') || null;
    this._cards = [];
    this._dragCounter = 0;
  }

  connectedCallback() {
    this.appendChild(templateColumn.content.cloneNode(true));
    this.$title = this.querySelector('h2');
    this.$editButton = this.querySelector('.column-edit-button');
    this.$deleteButton = this.querySelector('.column-delete-button');
    this.$titleInput = this.querySelector('.column-header-input');
    this.$saveButton = this.querySelector('.column-save-button');
    this.$cardCreator = this.querySelector('trello-card-creator');
    this.$cardsContainer = this.querySelector('.cards-container');
    this.$columnWrapper = this.querySelector('.column-wrapper');
    this.$cardCreator.addEventListener('cardCreation', this.addCard.bind(this));
    this.$columnWrapper.addEventListener('dragenter', this.onCardHover.bind(this));
    this.$columnWrapper.addEventListener('dragleave', this.onCardLeave.bind(this));
    this.$columnWrapper.addEventListener('drop', this.onDrop.bind(this));
    this.$columnWrapper.addEventListener('dragover', this.onDragOver.bind(this));
    this.$editButton.addEventListener('click', this.toggleEdit.bind(this));
    this.$saveButton.addEventListener('click', this.saveColumn.bind(this));
    this.$deleteButton.addEventListener('click', this.deleteColumn.bind(this));

    this._render();

    this.fetchData();
  }

  disconnectedCallback() { }

  static get observedAttributes() {
    return ['id', 'title'];
  }
  attributeChangedCallback(name, _, newValue) {
    this[`_${name}`] = newValue;
  }
  onDragOver(e) {
    e.preventDefault();
  }
  onCardHover(e) {
    e.preventDefault();
    this._dragCounter++;

    this.$columnWrapper.className += ' hovered';
  }
  onCardLeave() {
    this._dragCounter--;

    if (this._dragCounter === 0) {
      this.$columnWrapper.className = 'column-wrapper';
    }
  }
  async onDrop(e) {
    this.$columnWrapper.className = 'column-wrapper';
    this._dragCounter = 0;
    const data = JSON.parse(e.dataTransfer.getData('text/json'));

    await API.update.card({ ...data, columnId: this._id });

    await this.fetchData();
  }

  async fetchData() {
    const cards = await API.get.cards(`columnId=${this._id}`);

    this._cards = cards;

    this._render();
  }

  async addCard(e) {
    const { title, description } = e.detail;

    const data = await API.create.card({
      title,
      description,
      columnId: this._id,
    });

    this._cards.push(data);

    this._render();
  }

  replaceCard(e) {
    const newCard = e.detail;
    const index = this._cards.findIndex(card => card.id === newCard.id);
    this._cards[index] = newCard;
    this._render();
  }

  deleteCard(e) {
    const cardId = e.detail;
    const index = this._cards.findIndex(card => card.id === cardId);
    this._cards.splice(index, 1);
    this._render();
  }

  toggleEdit(e) {
    e.stopPropagation();

    this.__mode = this.__mode === 'view' ? 'edit' : 'edit';

    if (this.__mode === 'view') {
      this.$title.hidden = false;
      this.$titleInput.hidden = true;
      this.$saveButton.hidden = true;
    }

    if (this.__mode === 'edit') {
      this.$title.hidden = true;
      this.$titleInput.hidden = false;
      this.$saveButton.hidden = false;
      this.$titleInput.value = this._title;
    }
  }

  async deleteColumn() {
    if (!window.confirm('DO you want to delete the column?'))
      return;

    await API.delete.column({ id: this._id });

    this.dispatchEvent(new CustomEvent('columnDelete', { detail: this._id }));
  }

  async saveColumn(e) {
    e.stopPropagation();

    const id = this._id;
    const title = this.$titleInput.value;

    const column = await API.update.column({ id, title });

    this.dispatchEvent(new CustomEvent('columnUpdate', { detail: column }));

    this.toggleEdit(e);
  }


  _render() {
    this.$title.textContent = this._title;

    this.$cardsContainer.innerHTML = '';

    this._cards.forEach(({ id, title, description, columnId }, index) => {
      const $item = document.createElement('trello-card');

      $item.setAttribute('id', id);
      $item.setAttribute('title', title);
      $item.setAttribute('columnId', columnId);
      $item.setAttribute('description', description || '');

      $item.index = index;
      $item.addEventListener('cardUpdate', this.replaceCard.bind(this));
      $item.addEventListener('cardDelete', this.deleteCard.bind(this));
      $item.addEventListener('dragend', this.fetchData.bind(this));
      this.$cardsContainer.appendChild($item);
    });
  }
}

window.customElements.define('trello-column', TrelloColumn);
