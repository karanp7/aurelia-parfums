import React from 'react';
import PerfumeBottle from './PerfumeBottle.jsx';

// P1 fix (#6): every mood a product in the catalog can carry must be offered
// as a quiz answer, or that product can never reach a full match score.
// Magnetic (Midnight Fig) and Romantic (Rose Obscura) were previously missing.
const MOOD_OPTIONS = ['Elegant', 'Confident', 'Energizing', 'Comforting', 'Magnetic', 'Romantic'];

function QuizQuestion({ eyebrow, title, options, onAnswer }) {
  return <div className="quiz-question"><p className="overline dark">{eyebrow}</p><h2>{title}</h2><div>{options.map((option) => <button key={option} onClick={() => onAnswer(option)}><span>{option}</span><span aria-hidden="true">→</span></button>)}</div></div>;
}

export default function QuizModal({ quizStep, quizAnswers, quizMatches, onAnswer, onClose, onRetake, onAddSet, dialogRef }) {
  return <div className="overlay quiz-layer" role="dialog" aria-modal="true" aria-label="Scent finder" ref={dialogRef} tabIndex={-1}>
    <div className="quiz-modal">
      <button className="close" onClick={onClose} aria-label="Close quiz">×</button>
      <div className="quiz-progress"><span style={{ width: `${Math.min(100, ((quizStep + 1) / 5) * 100)}%` }}/></div>
      {quizStep === 0 && <QuizQuestion eyebrow="First, who is this for?" title="Are you choosing for yourself or someone else?" options={['Myself', 'Gift']} onAnswer={onAnswer}/>}
      {quizStep === 1 && <QuizQuestion eyebrow="The atmosphere" title="Which direction feels most natural?" options={['Floral', 'Woody', 'Fresh', 'Gourmand']} onAnswer={onAnswer}/>}
      {quizStep === 2 && <QuizQuestion eyebrow="The feeling" title="How should the fragrance make them feel?" options={MOOD_OPTIONS} onAnswer={onAnswer}/>}
      {quizStep === 3 && <QuizQuestion eyebrow="The presence" title="How noticeable should it be?" options={['Soft', 'Balanced', 'Bold']} onAnswer={onAnswer}/>}
      {quizStep >= 4 && <div className="quiz-result">
        <p className="overline dark">Your three-scent edit</p>
        <h2>{quizAnswers[0] === 'Gift' ? 'A thoughtful shortlist.' : 'Try these on your skin.'}</h2>
        <p>Varied enough to learn from, connected enough to feel personal.</p>
        <div className="result-grid">{quizMatches.map((product, index) => <article key={product.id}><span>{index === 0 ? 'Strongest match' : index === 1 ? 'Softer alternative' : 'More adventurous'}</span><div className={`mini-art tone-bg-${product.tone}`}><PerfumeBottle tone={product.tone} compact image={product.image} alt={product.imageAlt || product.name}/></div><h3>{product.name}</h3><p>{product.summary}</p></article>)}</div>
        <button className="btn btn-dark full" onClick={onAddSet}>Try all three — $18</button>
        <button className="retake" onClick={onRetake}>Retake quiz</button>
      </div>}
    </div>
  </div>;
}
