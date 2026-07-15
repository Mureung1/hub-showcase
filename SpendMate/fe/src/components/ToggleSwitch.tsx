interface ToggleSwitchProps {
    checked: boolean
    onChange: () => void
}

export default function ToggleSwitch({ checked, onChange}: ToggleSwitchProps){
    return(
        <button
        onClick={(e)=> {e.stopPropagation(); onChange()}}
        style={{
            width: 42, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: checked ? 'var(--primary)': 
            'rgba(255,255,255,0,15)', position: 'relative', transition: 'background 0.2s', flexShrink:0,}}>
                <div style={{
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'white',
                    position: 'absolute', top: 3, left: checked ? 21:3,
                    transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',

                }}/>
            </button>
            )}
