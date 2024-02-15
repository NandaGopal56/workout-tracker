'use strict';

class Workout {
    date = new Date();
    id = Date.now().toString().slice(-10) + Math.floor(Math.random() * 100);

    constructor(coords, distance, duration) {
        this.coords = coords;
        this.distance = distance; // in KM
        this.duration = duration; // in minues
    }

    _setDescription() {
        // prettier-ignore
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

        this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${months[this.date.getMonth()]} ${this.date.getDate()}`
    }
}

class Runnig extends Workout {
    constructor(coords, distance, duration, cadence) {
        super(coords, distance, duration);
        this.cadence = cadence;
        this.calcPace();
        this.type = 'running';
        this._setDescription();
    }

    calcPace() {
        // min/KM
        this.pace = this.duration / this.distance
        return this.pace
    }
}

class Cycling extends Workout {
    constructor(coords, distance, duration, elevation) {
        super(coords, distance, duration);
        this.elevation = elevation;
        this.calcSpeed();
        this.type = 'cycling';
        this._setDescription();
    }

    calcSpeed() {
        // km/h
        this.speed = this.distance / (this.duration / 60)
        return this.speed
    }
}



// let cycle = new Cycling([12.22, 23.33], 12, 123, 12);
// let run = new Runnig([12.22, 23.33], 12, 123, 12);
// console.log(cycle, run);

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');



// Appplication Architecture
class App {
    #map;
    #mapEvent;
    #workouts = [];
    #mapZomLevel = 11;

    constructor() {
        //get user's position
        this._getPosition()

        //Get data from localstorag eif available
        this._getWorkoutsFromLocalStorage()

        //attach event handlers
        form.addEventListener('submit', this._newWorkOut.bind(this));
        inputType.addEventListener('change', this._toggleElevationField);
        containerWorkouts.addEventListener('click', this._moveToPopUpMarker.bind(this))
    }

    _getPosition() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                this._loadMpa.bind(this), this._onLocationPermissionDenied
            )
        }
    }

    _loadMpa(position) {
        const latitude = position.coords.latitude
        const longitude = position.coords.longitude

        this.#map = L.map('map').setView([latitude, longitude], this.#mapZomLevel);

        L.tileLayer('https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(this.#map);

        this.#map.on('click', this._showForm.bind(this));

        this.#workouts.forEach(workout => {
            this._renderWokoutCard(workout)
            this._renderWorkoutMarker(workout)
        })
    }

    _onLocationPermissionDenied(error) {
        const userMessage = `${error.message}`
        alert(userMessage);
    }

    _showForm(event) {
        form.classList.remove('hidden')
        inputDistance.focus()
        this.#mapEvent = event;
    }

    _hideForm() {
        //Hide form & clear all input fields
        inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value = '';

        form.style.display = 'none';
        form.classList.add('hidden');
        setTimeout(() => form.style.display = 'grid', 1000)
    }

    _toggleElevationField() {
        inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
        inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
    }

    _newWorkOut(event) {
        event.preventDefault()

        const validInputs = (...inputs) => inputs.every(input => Number.isFinite(input));
        const allPositive = (...inputs) => inputs.every(input => input > 0);

        const type = inputType.value
        const distance = +inputDistance.value;
        const duration = +inputDuration.value;
        const coords = [this.#mapEvent.latlng.lat, this.#mapEvent.latlng.lng]
        let workout;

        if (type === 'running') {
            const cadence = +inputCadence.value;

            if (!validInputs(distance, duration, cadence) ||
                !allPositive(distance, duration, cadence))

                return alert('Inputs have to be positive numbers!')

            workout = new Runnig(coords, distance, duration, cadence)

        }

        if (type === 'cycling') {
            const elevation = +inputElevation.value;

            if (!validInputs(distance, duration, elevation) ||
                !allPositive(distance, duration))

                return alert('Inputs have to be positive numbers!')

            workout = new Cycling(coords, distance, duration, elevation)
        }

        this.#workouts.push(workout)
        console.log(workout);

        this._renderWorkoutMarker(workout);
        this._renderWokoutCard(workout);
        this._hideForm();
        this._setLocalStorage();
    }

    _renderWorkoutMarker(workout) {
        L.marker(workout.coords).addTo(this.#map)
            .bindPopup(L.popup({
                maxWidth: 250,
                minWidth: 100,
                autoClose: false,
                closeOnClick: false,
                className: `${workout.type}-popup`
            }).setContent(`${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`))
            .openPopup();
    }

    _renderWokoutCard(workout) {
        let html = `
        <li class="workout workout--${workout.type}" data-id="${workout.id}">
          <h2 class="workout__title">${workout.description}</h2>
          <div class="workout__details">
            <span class="workout__icon">
            ${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'}
            </span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
        `;

        if (workout.type == 'running')

            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.pace.toFixed(1)}</span>
                    <span class="workout__unit">min/km</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">🦶🏼</span>
                    <span class="workout__value">${workout.cadence}</span>
                    <span class="workout__unit">spm</span>
                </div>
            </li>
            `;

        if (workout.type === 'cycling')

            html += `
                <div class="workout__details">
                    <span class="workout__icon">⚡️</span>
                    <span class="workout__value">${workout.speed.toFixed(1)}</span>
                    <span class="workout__unit">km/h</span>
                </div>
                <div class="workout__details">
                    <span class="workout__icon">⛰</span>
                    <span class="workout__value">${workout.elevation}</span>
                    <span class="workout__unit">m</span>
                </div>
            </li>
            `;

        form.insertAdjacentHTML('afterend', html)

    }

    _moveToPopUpMarker(event) {
        const workOutElement = event.target.closest('.workout')

        if (!workOutElement) return;

        const workout = this.#workouts.find(
            work => work.id === workOutElement.dataset.id
        )

        this.#map.setView(workout.coords, this.#mapZomLevel, {
            animate: true,
            pan: {
                duration: 1
            }
        })
    }

    _setLocalStorage() {
        localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    }

    _getWorkoutsFromLocalStorage() {
        const data = JSON.parse(localStorage.getItem('workouts'));

        if (!data) return;

        this.#workouts = data;

    }

    reset() {
        localStorage.removeItem('workouts');
        location.reload();
    }
}


const app = new App();