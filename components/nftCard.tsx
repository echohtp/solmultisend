interface NftCardProps {
  image: string
  name: String
  select(): void
  unselect(): void
  selected: Boolean
}

export const NftCard = (props: NftCardProps) => {
  return (
    <>
      <div className='shadow-xl w-72 card card-compact bg-base-100'>
        <figure>
          <img
            src={props.image}
            alt='Shoes'
            className='image-square'
            width={'200px'}
          />
        </figure>
        <div className='card-body'>
          <h2 className='card-title'>{props.name}</h2>
          <div className='justify-end card-actions'>
            {props.selected ? (
              <button onClick={props.unselect} className='btn'>
                x
              </button>
            ) : (
              <button onClick={props.select} className='btn btn-primary'>
                +
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
